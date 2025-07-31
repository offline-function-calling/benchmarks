import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import ejs from 'ejs'
import { green, yellow, red, magenta, cyan, bold, gray, underline } from 'kolorist'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPORTS_DIR = path.join(__dirname, '../reports')
const OUTPUTS_DIR = path.join(__dirname, '../outputs')

const log = {
    info: (message) => console.log(`${cyan('[info]')} ${message.toLowerCase()}`),
    warn: (message) => console.log(`${yellow('[warn]')} ${message.toLowerCase()}`),
    error: (message, errorDetails) => {
        console.error(`${red('[error]')} ${message.toLowerCase()}`)
        if (errorDetails) console.error(errorDetails)
    },
    section: (title) => console.log(bold(underline(`\n${title.toLowerCase()}`))),
    summary: (label, value) => {
        const lowerLabel = label.toLowerCase()
        const padding = ' '.repeat(Math.max(0, 30 - lowerLabel.length))
        console.log(`${lowerLabel}:${padding}${bold(value)}`)
    }
}

async function generateReport() {
    console.log(magenta(bold(underline('\nbenchmark report analysis'))))

    try {
        log.section('data aggregation')
        log.info(`reading report files from directory: ${REPORTS_DIR}`)

        const reportFiles = await fs.readdir(REPORTS_DIR)
        const jsonFiles = reportFiles.filter(file => path.extname(file).toLowerCase() === '.json')

        if (jsonFiles.length === 0) {
            throw new Error(`no json report files found in the directory: ${REPORTS_DIR}`)
        }

        let allPrompts = []
        let allTestCases = []
        let earliestTimestamp = null
        let latestTimestamp = null

        for (const file of jsonFiles) {
            const filePath = path.join(REPORTS_DIR, file)
            try {
                const fileContent = await fs.readFile(filePath, 'utf-8')
                const reportData = JSON.parse(fileContent)

                if (reportData.results && reportData.results.prompts && reportData.results.results) {
                    allPrompts.push(...reportData.results.prompts)
                    allTestCases.push(...reportData.results.results)

                    if (reportData.results.timestamp) {
                        const currentTimestamp = new Date(reportData.results.timestamp)
                        if (!earliestTimestamp || currentTimestamp < earliestTimestamp) {
                            earliestTimestamp = currentTimestamp
                        }
                        if (!latestTimestamp || currentTimestamp > latestTimestamp) {
                            latestTimestamp = currentTimestamp
                        }
                    }
                } else {
                    log.warn(`skipping file '${file}': does not contain the expected results structure.`)
                }
            } catch (parseError) {
                log.error(`failed to parse json from file '${file}'. skipping.`, parseError.message)
            }
        }

        log.info(`successfully processed and combined data from ${jsonFiles.length} report files.`)

        const evalId = `eval-combined-${Date.now().toString(36)}`
        const timestamp = new Date().toISOString()
        const prompts = allPrompts
        const testCases = allTestCases

        let providers = prompts.map(p => {
            const metrics = p.metrics || {}
            const totalTests = (metrics.testPassCount || 0) + (metrics.testFailCount || 0)
            const scenarioScore = totalTests > 0 ? (metrics.testPassCount / totalTests) : 0
            const totalRequests = metrics.tokenUsage?.numRequests || 1
            const avgLatency = (metrics.totalLatencyMs || 0) / totalRequests

            return {
                ...p,
                scenarioScore,
                avgLatency,
            }
        })

        log.section('statistical analysis')

        const providerCount = providers.length
        const totalTests = providers.reduce((sum, p) =>
            sum + (p.metrics?.testPassCount || 0) + (p.metrics?.testFailCount || 0) + (p.metrics?.testErrorCount || 0), 0)

        const uniqueParameters = new Set()
        const uniqueScenarios = new Set()
        for (const caseResult of testCases) {
            const metadata = caseResult.testCase?.metadata
            if (metadata) {
                if (Array.isArray(metadata.parameters)) {
                    metadata.parameters.flat().forEach(param => uniqueParameters.add(param))
                }
                if (metadata.conversationId) {
                    uniqueScenarios.add(metadata.conversationId)
                }
            }
        }
        const scenarioCount = uniqueScenarios.size

        const totalStatLatency = providers.reduce((sum, p) => sum + p.avgLatency, 0)
        const avgStatLatency = providerCount > 0 ? totalStatLatency / providerCount : 0

        const { totalAssertionInputTokens, totalAssertionOutputTokens } = allPrompts.reduce(
            (acc, prompt) => {
                const assertionUsage = prompt.metrics?.tokenUsage?.assertions
                if (assertionUsage) {
                    acc.totalAssertionInputTokens += assertionUsage.prompt || 0
                    acc.totalAssertionOutputTokens += assertionUsage.completion || 0
                }
                return acc
            },
            { totalAssertionInputTokens: 0, totalAssertionOutputTokens: 0 }
        )

        const totalAssertionRequests = allTestCases.reduce((sum, caseResult) => {
            const componentResults = caseResult.gradingResult?.componentResults || []
            const rubricAssertionsCount = componentResults.filter(c => c.assertion?.type === 'llm-rubric').length
            return sum + rubricAssertionsCount
        }, 0)

        let assertionRequestsPerMinute = 0
        if (earliestTimestamp && latestTimestamp) {
            const totalDurationMinutes = (latestTimestamp.getTime() - earliestTimestamp.getTime()) / 60000
            if (totalDurationMinutes > 0) {
                assertionRequestsPerMinute = totalAssertionRequests / totalDurationMinutes
            }
        }

        const stats = {
            providerCount,
            scenarioCount,
            uniqueParametersCount: uniqueParameters.size,
            totalTests,
            avgLatency: avgStatLatency,
            totalAssertionTokens: totalAssertionInputTokens + totalAssertionOutputTokens,
            totalAssertionInputTokens,
            totalAssertionOutputTokens,
            totalAssertionRequests,
            assertionRequestsPerMinute,
        }

        log.info('calculated aggregate statistics.')

        const providerTestCases = {}
        for (const caseResult of testCases) {
            const providerId = caseResult.provider?.id
            if (!providerId) continue

            if (!providerTestCases[providerId]) {
                providerTestCases[providerId] = []
            }
            providerTestCases[providerId].push(caseResult)
        }

        log.section('scoring and ranking')
        log.info('calculating metadata parameter scores...')
        const providerParamScores = {}
        for (const providerId in providerTestCases) {
            const cases = providerTestCases[providerId]
            const paramScores = {}
            
            for (const caseResult of cases) {
                const componentResults = caseResult.gradingResult?.componentResults || []
                const assertionParams2D = caseResult.testCase?.metadata?.parameters

                if (Array.isArray(componentResults) && Array.isArray(assertionParams2D)) {
                    const numAssertionsToProcess = Math.min(componentResults.length, assertionParams2D.length)

                    if (componentResults.length > 0 && assertionParams2D.length > 0 && componentResults.length !== assertionParams2D.length) {
                        log.warn(`mismatch between number of assertions (${componentResults.length}) and parameter groups (${assertionParams2D.length}) for a test case. processing ${numAssertionsToProcess} pairs.`)
                    }

                    for (let i = 0; i < numAssertionsToProcess; i++) {
                        const assertionResult = componentResults[i]
                        const paramsForAssertion = assertionParams2D[i]
                        const assertionScore = assertionResult.score ?? 0

                        if (Array.isArray(paramsForAssertion)) {
                            for (const paramName of paramsForAssertion) {
                                if (typeof paramName === 'string' && paramName.length > 0) {
                                    if (!paramScores[paramName]) {
                                        paramScores[paramName] = { totalScore: 0, count: 0 }
                                    }
                                    paramScores[paramName].totalScore += assertionScore
                                    paramScores[paramName].count += 1
                                }
                            }
                        }
                    }
                }
            }

            const avgParamScores = {}
            let scoresArray = []
            for (const paramName in paramScores) {
                const avgScore = paramScores[paramName].totalScore / paramScores[paramName].count
                avgParamScores[paramName] = avgScore
                scoresArray.push(avgScore)
            }

            if (scoresArray.length === 0) {
                providerParamScores[providerId] = {}
                continue
            }

            const minScore = Math.min(...scoresArray)
            const maxScore = Math.max(...scoresArray)
            const range = maxScore - minScore
            const normalizedScores = {}

            for (const paramName in avgParamScores) {
                const avgScore = avgParamScores[paramName]
                const normalized = range > 0 ? (avgScore - minScore) / range : 1.0
                normalizedScores[paramName] = normalized
            }
            providerParamScores[providerId] = normalizedScores
        }

        log.info('calculating composite scores and sorting models...')
        const latencies = providers.map(p => p.avgLatency)
        const minLatency = Math.min(...latencies)
        const maxLatency = Math.max(...latencies)
        const latencyRange = maxLatency - minLatency

        for (const provider of providers) {
            const paramScores = providerParamScores[provider.provider] || {}
            const scoreValues = Object.values(paramScores)
            let overallParamScore = 0
            if (scoreValues.length > 0) {
                overallParamScore = scoreValues.reduce((sum, s) => sum + s, 0) / scoreValues.length
            }
            provider.parameterScore = overallParamScore

            const normalizedScenarioScore = provider.scenarioScore
            const normalizedLatencyScore = (latencyRange > 0) ? (maxLatency - provider.avgLatency) / latencyRange : 1

            const weightScenarioScore = 0.48
            const weightParamScore = 0.48
            const weightLatency = 0.04

            const finalCompositeScore =
                (normalizedScenarioScore * weightScenarioScore) +
                (overallParamScore * weightParamScore) +
                (normalizedLatencyScore * weightLatency)
            provider.compositeScore = finalCompositeScore
        }

        const sortedProviders = providers.sort((a, b) => {
            const scenarioScoreDiff = (b.scenarioScore || 0) - (a.scenarioScore || 0)
            if (scenarioScoreDiff !== 0) return scenarioScoreDiff

            const paramScoreDiff = (b.parameterScore || 0) - (a.parameterScore || 0)
            if (paramScoreDiff !== 0) return paramScoreDiff

            return (b.avgLatency || 0) - (a.avgLatency || 0)
        })
        log.info('model scoring and ranking complete.')

        log.section('report generation')
        const templatePath = path.join(__dirname, 'template.ejs')
        const templateData = {
            evalId,
            timestamp,
            sortedProviders,
            providerTestCases,
            providerParamScores,
            stats,
            formatNum: (n, decimals = 2, padding = 0) => String((n || 0).toFixed(decimals)).padStart(padding + decimals + 1, '0'),
        }

        const html = await ejs.renderFile(templatePath, templateData)
        log.info('rendered html from ejs template.')

        const outputPath = path.join(OUTPUTS_DIR, 'leaderboard.html')
        await fs.writeFile(outputPath, html)

        log.info(`html leaderboard saved to: ${outputPath}`)

        log.section('run summary')
        log.summary('models analyzed', stats.providerCount)
        log.summary('scenarios run', stats.scenarioCount)
        log.summary('total tests run', stats.totalTests.toLocaleString())
        log.summary('average latency (ms)', stats.avgLatency.toFixed(0))

        log.section('assertion metrics')
        log.summary('total assertion tokens', stats.totalAssertionTokens.toLocaleString())
        log.summary('  - input (prompt)', stats.totalAssertionInputTokens.toLocaleString())
        log.summary('  - output (completion)', stats.totalAssertionOutputTokens.toLocaleString())
        log.summary('total assertion requests', stats.totalAssertionRequests.toLocaleString())
        log.summary('assertion requests/min', stats.assertionRequestsPerMinute.toFixed(2))

        console.log(green(bold('\nprocess completed successfully.\n')))
    } catch (error) {
        log.error('a critical error occurred during leaderboard generation.', error.stack)
        if (error.code === 'ENOENT') {
            log.error(`the directory '${REPORTS_DIR}' or the template 'template.ejs' was not found. please ensure they are in the correct locations.`)
        }
        process.exit(1)
    }
}

await generateReport()
