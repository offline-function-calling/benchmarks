import path from 'path'
import fs from 'fs/promises'
import { createWriteStream } from 'fs'

import yaml from 'js-yaml'
import { execa } from 'execa'
import { green, yellow, red, magenta, cyan, bold, underline } from 'kolorist'

const CONFIG_FILE = 'evaluator.yaml'
const PROVIDERS_FILE = 'providers.yaml'
const REPORTS_DIR = 'reports'
const LOGS_DIR = 'logs'

const log = {
    info: (message) => console.log(`${cyan('[info]')} ${message}`),
    warn: (message) => console.log(`${yellow('[warn]')} ${message}`),
    success: (message) => console.log(`${green('[success]')} ${message}`),
    error: (message, errorDetails) => {
        console.error(`${red('[error]')} ${message}`)
        if (errorDetails) console.error(errorDetails)
    },
    section: (title) => console.log(bold(underline(`\n${title}`))),
}

function generateModelSlug(modelId) {
  return modelId.replace('ollama:chat:', '').replace(/:/g, '-')
}

async function runAllTests() {
  console.log(magenta(bold(underline('\noffline function calling benchmark\n'))))

  let models
  try {
    const fileContents = await fs.readFile(PROVIDERS_FILE, 'utf8')
    models = yaml.load(fileContents)
    if (!Array.isArray(models) || models.length === 0) {
      throw new Error('File is empty or not a valid YAML list.')
    }
  } catch (error) {
    log.error(`failed to read '${PROVIDERS_FILE}' - please ensure it exists and is a valid yaml list.`, error.message)
    process.exit(1)
  }

  try {
    await fs.mkdir(REPORTS_DIR, { recursive: true })
    await fs.mkdir(LOGS_DIR, { recursive: true })
    log.info(`reports will be saved in '${REPORTS_DIR}'`)
    log.info(`command logs will be streamed to '${LOGS_DIR}'`)
  } catch (error) {
    log.error(`could not create output directories`, error)
    process.exit(1)
  }

  let baseConfigContent
  try {
    baseConfigContent = await fs.readFile(CONFIG_FILE, 'utf8')
  } catch (error) {
    log.error(`failed to read the config file '${CONFIG_FILE}' - please ensure it exists.`, error)
    process.exit(1)
  }

  const providerRegex = /^\s*providers:.*/m
  if (!providerRegex.test(baseConfigContent)) {
    log.error(`could not find a 'providers:' key in '${CONFIG_FILE}'.`)
    process.exit(1)
  }

  log.info(`found ${models.length} models to test from '${PROVIDERS_FILE}'.`)

  for (const [index, modelId] of models.entries()) {
    const modelSlug = generateModelSlug(modelId)
    const outputPath = path.join(REPORTS_DIR, `${modelSlug}.json`)
    const logPath = path.join(LOGS_DIR, `${modelSlug}.log`)

    log.section(`test ${index + 1}/${models.length}: ${modelId}`)

    const logStream = createWriteStream(logPath)

    try {
      const newConfigContent = baseConfigContent.replace(providerRegex, `providers: [${JSON.stringify(modelId)}]`) // Use JSON.stringify to handle potential special chars
      await fs.writeFile(CONFIG_FILE, newConfigContent, 'utf8')
      log.info(`updated '${CONFIG_FILE}' for model`)

      const commandArgs = [
        'promptfoo', 'eval', '--verbose',
        '--grader', 'openai:gpt-4.1-mini',
        '--config', CONFIG_FILE,
        '--output', outputPath
      ]

      log.info(`executing tests for ${modelId}...`)
      log.info(`streaming output to ${logPath}.`)

      const childProcess = execa('npx', commandArgs)

      childProcess.stdout.pipe(logStream)
      childProcess.stderr.pipe(logStream)

      await childProcess

      log.success(`finished test for ${modelId}.`)
      log.success(`report saved to: ${outputPath}.`)
    } catch (error) {
      if (error.exitCode === 100) {
        log.success(`finished test for ${modelId} with some failures.`)
        log.success(`report saved to: ${outputPath}.`)
      } else {
        log.error(`failed test for model ${modelId}.`, error.message)
      }
    } finally {
        logStream.end()
    }
  }

  console.log(green(bold(underline('\nall tests completed.\n'))))
}

await runAllTests()
