const codeBlockRegex = /(?<all>(?<start>```)(?<label>\w+)?[^\n]*\n(?<content>[\s\S]*?)\n```)/g
const findCodeBlocks = (label, content) => {
  const blocks = []

  const matches = content.matchAll(codeBlockRegex)
  for (const match of matches) {
    if (match?.groups?.label === label) {
      blocks.push(match.groups.content)
    }
  }

  return blocks
}

export const findFunctionCalls = (output, context) => {
  const expected = Array.isArray(context.vars.expected?.calls) ?
    context.vars.expected.calls.length : context.vars.expected?.calls ?? 0
  const counted = findCodeBlocks('function_call', output).length

  return {
    pass: counted === expected,
    score: expected === 0 ? 1 : counted / expected,
    reason: `Expected ${expected} function calls, got ${counted}.`,
  }
}

export const findFunctionOutputs = (output, context) => {
  const expected = context.vars.expected?.outputs ?? 0
  const counted = findCodeBlocks('function_output', output).length

  return {
    pass: counted === expected,
    score: expected === 0 ? 1 : counted / expected,
    reason: `Expected ${expected} function outputs, got ${counted}.`,
  }
}

export const findFunctionSpecifications = (output, context) => {
  const expected = context.vars.expected?.specs ?? 0
  const counted = findCodeBlocks('function_spec', output).length

  return {
    pass: counted === expected,
    score: expected === 0 ? 1 : counted / expected,
    reason: `Expected ${expected} function specifications, got ${counted}.`,
  }
}

const findMismatch = (expected, actual, path = '') => {
  if (typeof expected !== typeof actual) return {
    path, reason: 'Mismatched types', expected: typeof expected, actual: typeof actual
  }

  if (expected === null) return actual === null ? null : {
    path, reason: 'Mismatched value', expected, actual
  }

  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) return {
      path, reason: 'Mismatched types', expected: 'array', actual: typeof actual
    }

    if (expected.length !== actual.length) return {
      path, reason: 'Mismatched array length', expected: expected.length, actual: actual.length
    }

    for (let i = 0; i < expected.length; i++) {
      const mismatch = findMismatch(expected[i], actual[i], `${path}[${i}]`)
      if (mismatch) return mismatch
    }

    return null
  }

  if (typeof expected === 'object') {
    const expectedKeys = Object.keys(expected).sort()
    const actualKeys = Object.keys(actual).sort()

    if (JSON.stringify(expectedKeys) !== JSON.stringify(actualKeys)) {
      const missingKey = expectedKeys.find(k => !actualKeys.includes(k))
      if (missingKey) return {
        path, reason: `Missing parameter '${missingKey}'`, expected: `'${missingKey}' to exist`, actual: 'Parameter not found'
      }
    }

    for (const key of expectedKeys) {
      const newPath = path ? `${path}.${key}` : key
      const mismatch = findMismatch(expected[key], actual[key], newPath)
      if (mismatch) return mismatch
    }

    return null
  }

  if (expected !== actual) return { path, reason: 'Mismatched value', expected, actual }
  return null
}

export const matchFunctionCalls = (output, context) => {
  const expected = context.vars?.expected?.calls
  if (!Array.isArray(expected)) {
    return {
      pass: true, score: 1,
      reason: `No expected function calls to validate.`
    }
  }

  const parseErrors = []
  const calls = findCodeBlocks('function_call', output).map(block => {
    try {
      return JSON.parse(block)
    } catch (error) {
      parseErrors.push(`Failed to parse function call block: ${error.message}`)
      return null
    }
  }).filter(call => call !== null)

  if (expected.length === 0) {
    const pass = calls.length === 0
    return {
      pass, score: pass ? 1 : 0,
      reason: `Expected 0 function calls, but found ${calls.length}.`
        + (calls.length > 0 ? ` Found: ${calls.map(c => c.function).join(', ')}.` : '')
    }
  }

  const usedExpectedIndices = new Set()
  const usedActualIndices = new Set()

  for (let i = 0; i < calls.length; i++) {
    for (let j = 0; j < expected.length; j++) {
      if (usedActualIndices.has(i) || usedExpectedIndices.has(j)) continue
      if (findMismatch(expected[j], calls[i]) === null) {
        usedActualIndices.add(i)
        usedExpectedIndices.add(j)
        break
      }
    }
  }

  const matchedCount = usedExpectedIndices.size
  const pass = matchedCount === expected.length && calls.length === expected.length
  const score = expected.length === 0 ? 1 : matchedCount / expected.length

  let reason
  if (pass) {
    reason = `All ${expected.length} function call(s) matched expected specifications.`
  } else {
    const reasonParts = []
    reasonParts.push(`${matchedCount} of ${expected.length} expected calls matched (found ${calls.length} total calls).`)

    const parameterMismatches = []

    let remainingUnmet = expected.filter((_, j) => !usedExpectedIndices.has(j))
    let remainingUnmatched = calls.filter((_, i) => !usedActualIndices.has(i))

    const newRemainingUnmet = []

    remainingUnmet.forEach(unmet => {
      const matchIndex = remainingUnmatched.findIndex(unmatched => unmet.function === unmatched.function)
      if (matchIndex !== -1) {
        const matchedCall = remainingUnmatched[matchIndex]
        const mismatchDetails = findMismatch(unmet, matchedCall)
        if (mismatchDetails) {
            const { path, reason: mismatchReason, expected: expectedVal, actual: actualVal } = mismatchDetails
            parameterMismatches.push(`Mismatched parameter for '${unmet.function}': ${mismatchReason} at '${path}' (expected: ${JSON.stringify(expectedVal)}, got: ${JSON.stringify(actualVal)})`)
        }
        remainingUnmatched.splice(matchIndex, 1)
      } else {
        newRemainingUnmet.push(unmet)
      }
    })

    remainingUnmet = newRemainingUnmet

    if (parameterMismatches.length > 0) {
      reasonParts.push(`Mismatches: ${parameterMismatches.join('; ')}.`);
    }
    if (remainingUnmet.length > 0) {
      const unmetStr = remainingUnmet.map(e => `'${e.function}'`).join(', ')
      reasonParts.push(`Expected calls not made: ${unmetStr}.`);
    }
    if (remainingUnmatched.length > 0) {
      const unexpectedStr = remainingUnmatched.map(c => `'${c.function}'`).join(', ')
      reasonParts.push(`Unexpected calls made: ${unexpectedStr}.`);
    }
    if (parseErrors.length > 0) {
      reasonParts.push(`Parse errors: ${parseErrors.join('; ')}.`)
    }
    reason = reasonParts.join(' ')
  }

  return { pass, score, reason }
}
