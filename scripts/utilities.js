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
    score: expected === 0 ? 0 : counted / expected,
    reason: `Expected ${expected} function calls, got ${counted}.`,
  }
}

export const findFunctionOutputs = (output, context) => {
  const expected = context.vars.expected?.outputs ?? 0
  const counted = findCodeBlocks('function_output', output).length

  return {
    pass: counted === expected,
    score: expected === 0 ? 0 : counted / expected,
    reason: `Expected ${expected} function outputs, got ${counted}.`,
  }
}

export const findFunctionSpecifications = (output, context) => {
  const expected = context.vars.expected?.specs ?? 0
  const counted = findCodeBlocks('function_spec', output).length

  return {
    pass: counted === expected,
    score: expected === 0 ? 0 : counted / expected,
    reason: `Expected ${expected} function specifications, got ${counted}.`,
  }
}

export const matchFunctionCalls = (output, context) => {
  const expected = context.vars?.expected?.calls
  if (!Array.isArray(expected)) {
    return {
      pass: true, score: 1,
      reason: `No expected function calls to validate.`
    }
  }

  const calls = findCodeBlocks('function_call', output).map(JSON.parse)
  if (expected.length === 0) {
    return {
      pass: calls.length === 0, score: calls.length === 0 ? 1 : 0,
      reason: `Expected 0 function calls, got ${calls.length}.`
    }
  }

  let matchedCount = 0
  const usedExpectedIndices = new Set()
  const unmatchedCalls = []
  const parseErrors = []

  for (const call of calls) {
    try {
      const matchingExpectedIndex = expected.findIndex((expectedCall, index) => {
        if (usedExpectedIndices.has(index)) return false
        if (call.function !== expectedCall.function) return false
        if (!call.parameters && !expectedCall.parameters) return true
        if (!call.parameters || !expectedCall.parameters) return false

        const actualParams = call.parameters
        const expectedParams = expectedCall.parameters
        for (const [key, value] of Object.entries(expectedParams)) {
          if (actualParams[key] !== value) return false
        }

        // disallow extra parameters
        // for (const key of Object.keys(actualParams)) {
        //   if (!(key in expectedParams)) return false
        // }

        return true
      })

      if (matchingExpectedIndex !== -1) {
        matchedCount++
        usedExpectedIndices.add(matchingExpectedIndex)
      } else {
        unmatchedCalls.push(call)
      }
    } catch (error) { 
      parseErrors.push(`Failed to parse function call: ${error.message}`)
    }
  }

  const score = expected.length === 0 ? 0 : matchedCount / expected.length
  const pass = matchedCount === expected.length && calls.length === expected.length

  let reason
  if (pass) {
    reason = `All ${expected.length} function calls match expected specifications.`
  } else {
    let reasonParts = []

    if (matchedCount === 0) {
      reasonParts.push(`No function calls matched`)
    } else {
      reasonParts.push(`${matchedCount} out of ${expected.length} function calls matched`)
    }

    if (calls.length !== expected.length) {
      reasonParts.push(`Expected ${expected.length} function calls, got ${calls.length}`)
    }

    if (unmatchedCalls.length > 0) {
      const unmatchedDetails = unmatchedCalls.map(call => {
        const expectedFunctions = expected.map(e => e.function).join(', ')
        return `'${call.function}' (expected: ${expectedFunctions})`
      }).join(', ')
      reasonParts.push(`Unmatched calls: ${unmatchedDetails}`)
    }

    if (parseErrors.length > 0) {
      reasonParts.push(`Parse errors: ${parseErrors.join('; ')}`)
    }

    reason = reasonParts.join('. ') + '.'
  }

  return { pass, score, reason }
}
