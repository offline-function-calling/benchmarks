import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import ejs from 'ejs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPORTS_DIR = path.join(__dirname, '../reports')

async function generateReport() {
    console.log("Starting leaderboard generation...")

    try {
        console.log(`Reading and combining reports from: ${REPORTS_DIR}`)

        const reportFiles = await fs.readdir(REPORTS_DIR)
        const jsonFiles = reportFiles.filter(file => path.extname(file).toLowerCase() === '.json')

        if (jsonFiles.length === 0) {
            throw new Error(`No JSON report files found in the directory: ${REPORTS_DIR}`)
        }

        let allPrompts = []
        let allTestCases = []

        for (const file of jsonFiles) {
            const filePath = path.join(REPORTS_DIR, file)
            try {
                const fileContent = await fs.readFile(filePath, 'utf-8')
                const reportData = JSON.parse(fileContent)

                if (reportData.results && reportData.results.prompts && reportData.results.results) {
                    allPrompts.push(...reportData.results.prompts)
                    allTestCases.push(...reportData.results.results)
                    console.log(`Successfully processed and added ${file}`)
                } else {
                    console.warn(`Skipping ${file}: does not contain the expected results structure.`)
                }
            } catch (parseError) {
                console.error(`Error parsing ${file}: ${parseError.message}. Skipping this file.`)
            }
        }

        console.log(`Successfully combined data from ${jsonFiles.length} report files.`)

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

        const providerCount = providers.length
        const totalTests = providers.reduce((sum, p) =>
            sum + (p.metrics?.testPassCount || 0) + (p.metrics?.testFailCount || 0) + (p.metrics?.testErrorCount || 0), 0)

        const uniqueParameters = new Set()
        for (const caseResult of testCases) {
            const metadataParams = caseResult.testCase?.metadata?.parameters
            if (Array.isArray(metadataParams)) {
                metadataParams.forEach(param => uniqueParameters.add(param))
            }
        }

        const totalStatLatency = providers.reduce((sum, p) => sum + p.avgLatency, 0)
        const avgStatLatency = providerCount > 0 ? totalStatLatency / providerCount : 0

        const stats = {
            providerCount,
            scenarioCount: 10,
            uniqueParametersCount: uniqueParameters.size,
            totalTests,
            avgLatency: avgStatLatency,
        }
        console.log("Calculated aggregate stats")

        const providerTestCases = {}
        for (const caseResult of testCases) {
            const providerId = caseResult.provider?.id
            if (!providerId) continue

            if (!providerTestCases[providerId]) {
                providerTestCases[providerId] = []
            }
            providerTestCases[providerId].push(caseResult)
        }
        console.log("Processed and aggregated test data")

        console.log("Calculating metadata parameter scores...")
        const providerParamScores = {}
        for (const providerId in providerTestCases) {
            const cases = providerTestCases[providerId]
            const paramScores = {}
            for (const caseResult of cases) {
                const score = caseResult.score || 0
                const metadataParams = caseResult.testCase?.metadata?.parameters
                if (Array.isArray(metadataParams)) {
                    for (const paramName of metadataParams) {
                        if (!paramScores[paramName]) {
                            paramScores[paramName] = { totalScore: 0, count: 0 }
                        }
                        paramScores[paramName].totalScore += score
                        paramScores[paramName].count += 1
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
        console.log("Metadata parameter scores calculated.")

        console.log("Calculating composite score and overall parameter scores...")
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
        console.log("Composite scores calculated.")

        const sortedProviders = providers.sort((a, b) => {
            const scenarioScoreDiff = (b.scenarioScore || 0) - (a.scenarioScore || 0)
            if (scenarioScoreDiff !== 0) return scenarioScoreDiff

            const paramScoreDiff = (b.parameterScore || 0) - (a.parameterScore || 0)
            if (paramScoreDiff !== 0) return paramScoreDiff

            return (b.avgLatency || 0) - (a.avgLatency || 0)
        })
        console.log("Sorted providers by scores.")

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
        console.log("Rendered HTML from template")

        const outputPath = path.join(__dirname, '../leaderboard.html')
        await fs.writeFile(outputPath, html)

        console.log(`Success! Leaderboard saved as leaderboard.html.`)

    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error(`Error: The directory '${REPORTS_DIR}' or the template 'template.ejs' was not found. Please ensure they are in the correct locations.`)
        } else {
            console.error("An unexpected error occurred:", error)
        }
        process.exit(1)
    }
}

await generateReport()
