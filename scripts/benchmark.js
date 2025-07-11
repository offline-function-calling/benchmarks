import fs from 'fs/promises'
import path from 'path'
import { execa } from 'execa'

const CONFIG_FILE = 'evaluator.yaml'
const OUTPUT_DIR = 'reports'

const models = [
  'ollama:chat:gemma3n:e2b',
  'ollama:chat:gemma3n:e4b',
  'ollama:chat:gemma3n:e2b-it-q4_K_M',
  'ollama:chat:gemma3n:e2b-it-q8_0',
  'ollama:chat:gemma3n:e2b-it-fp16',
  'ollama:chat:gemma3n:e4b-it-q4_K_M',
  'ollama:chat:gemma3n:e4b-it-q8_0',
  'ollama:chat:gemma3n:e4b-it-fp16',
  'ollama:chat:gemma3:1b',
  'ollama:chat:gemma3:4b',
  'ollama:chat:gemma3:12b',
  'ollama:chat:gemma3:27b',
  'ollama:chat:gemma3:1b-it-qat',
  'ollama:chat:gemma3:1b-it-q4_K_M',
  'ollama:chat:gemma3:1b-it-q8_0',
  'ollama:chat:gemma3:1b-it-fp16',
  'ollama:chat:gemma3:4b-it-qat',
  'ollama:chat:gemma3:4b-it-q4_K_M',
  'ollama:chat:gemma3:4b-it-q8_0',
  'ollama:chat:gemma3:4b-it-fp16',
  'ollama:chat:gemma3:12b-it-qat',
  'ollama:chat:gemma3:12b-it-q4_K_M',
  'ollama:chat:gemma3:12b-it-q8_0',
  'ollama:chat:gemma3:12b-it-fp16',
  'ollama:chat:gemma3:27b-it-qat',
  'ollama:chat:gemma3:27b-it-q4_K_M',
  'ollama:chat:gemma3:27b-it-q8_0',
  'ollama:chat:gemma3:27b-it-fp16',
]

function generateModelSlug(modelId) {
  return modelId.replace('ollama:chat:', '').replace(/:/g, '-')
}

async function runAllTests() {
  console.log(`Found ${models.length} models to test.`)

  try {
    await fs.mkdir(OUTPUT_DIR, { recursive: true })
    console.log(`Reports will be saved in the '${OUTPUT_DIR}' directory.`)
  } catch (error) {
    console.error(`Could not create output directory '${OUTPUT_DIR}':`, error)
    return
  }

  // Read the base config file content once.
  let baseConfigContent
  try {
    baseConfigContent = await fs.readFile(CONFIG_FILE, 'utf8')
  } catch (error) {
    console.error(`Fatal: Could not read the config file '${CONFIG_FILE}'. Please make sure it exists.`)
    return
  }

  // Regex to find the line starting with "providers:" (with optional leading space).
  // The 'm' flag ensures '^' matches the start of a line, not just the start of the file.
  const providerRegex = /^\s*providers:.*/m

  if (!providerRegex.test(baseConfigContent)) {
    console.error(`Fatal: Could not find a 'providers:' key in '${CONFIG_FILE}'. Script cannot continue.`)
    return
  }

  for (const [index, modelId] of models.entries()) {
    console.log('\n' + '-'.repeat(60))
    console.log(`Starting test ${index + 1}/${models.length} for model: ${modelId}`)
    console.log('-'.repeat(60))

    try {
      // Replace the old providers line with the new one.
      const newConfigContent = baseConfigContent.replace(providerRegex, `providers: [${modelId}]`)
      await fs.writeFile(CONFIG_FILE, newConfigContent, 'utf8')
      console.log(`   Updated '${CONFIG_FILE}' to use provider: ${modelId}`)

      const modelSlug = generateModelSlug(modelId)
      const outputPath = path.join(OUTPUT_DIR, `${modelSlug}.json`)

      const commandArgs = [
        'promptfoo',
        'eval',
        '--grader', 'google:gemini-2.5-flash',
        '--config', CONFIG_FILE,
        '--output', outputPath
      ]

      console.log(`   Executing: npx ${commandArgs.join(' ')}\n`)

      await execa('npx', commandArgs, { stdio: 'inherit' })

      console.log(`\nSuccessfully finished test for ${modelId}.`)
      console.log(`   Report saved to: ${outputPath}`)

    } catch (error) {
      console.error(`\nFAILED test for model: ${modelId}`)
      console.error('   Error details:', error.message)
      console.log('   Stopping the test suite due to failure.')
    }
  }

  console.log('\n' + '*'.repeat(60))
  console.log('All tests completed or stopped due to failure.')
  console.log('*'.repeat(60))
}

await runAllTests()
