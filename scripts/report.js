import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import ejs from 'ejs'

import data from '../report.json' with { type: 'json' }

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function generateReport() {
    console.log("Starting leaderboard generation...")

    try {
        console.log("Successfully imported report.json")

        const { evalId, results } = data
        const { timestamp, prompts, results: testCases } = results

        const sortedProviders = prompts
            .map(p => {
                const metrics = p.metrics || {}
                const totalTests = (metrics.testPassCount || 0) + (metrics.testFailCount || 0)
                const passRate = totalTests > 0 ? (metrics.testPassCount / totalTests) * 100 : 0
                const totalRequests = metrics.tokenUsage?.numRequests || 1
                const avgLatency = (metrics.totalLatencyMs || 0) / totalRequests
                
                return {
                    ...p,
                    passRate,
                    avgLatency,
                }
            })
            .sort((a, b) => (b.passRate) - (a.passRate))

        const providerCount = sortedProviders.length

        const totalScore = sortedProviders.reduce((sum, p) => sum + (p.metrics?.score || 0), 0)
        const avgScore = providerCount > 0 ? totalScore / providerCount : 0

        const totalTests = sortedProviders.reduce((sum, p) =>
            sum + (p.metrics?.testPassCount || 0) + (p.metrics?.testFailCount || 0) + (p.metrics?.testErrorCount || 0), 0)

        const totalLatency = sortedProviders.reduce((sum, p) => sum + p.avgLatency, 0)
        const avgLatency = providerCount > 0 ? totalLatency / providerCount : 0

        const stats = {
            providerCount,
            avgScore,
            totalTests,
            avgLatency
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
        const providerParamScores = {};

        for (const providerId in providerTestCases) {
            const cases = providerTestCases[providerId];
            const paramScores = {};

            for (const caseResult of cases) {
                const score = caseResult.score || 0;
                const metadataParams = caseResult.testCase?.metadata?.parameters;

                if (Array.isArray(metadataParams)) {
                    for (const paramName of metadataParams) {
                        if (!paramScores[paramName]) {
                            paramScores[paramName] = { totalScore: 0, count: 0 };
                        }
                        paramScores[paramName].totalScore += score;
                        paramScores[paramName].count += 1;
                    }
                }
            }

            const avgParamScores = {};
            let scoresArray = [];
            for (const paramName in paramScores) {
                const avgScore = paramScores[paramName].totalScore / paramScores[paramName].count;
                avgParamScores[paramName] = avgScore;
                scoresArray.push(avgScore);
            }

            if (scoresArray.length === 0) {
                providerParamScores[providerId] = {};
                continue;
            }

            const minScore = Math.min(...scoresArray);
            const maxScore = Math.max(...scoresArray);
            const range = maxScore - minScore;

            const normalizedScores = {};
            for (const paramName in avgParamScores) {
                const avgScore = avgParamScores[paramName];
                const normalized = range > 0 ? (avgScore - minScore) / range : 1.0;
                normalizedScores[paramName] = normalized;
            }

            providerParamScores[providerId] = normalizedScores;
        }
        console.log("Metadata parameter scores calculated and normalized.")

        const templatePath = path.join(__dirname, 'template.ejs')
        const templateData = {
            evalId,
            timestamp,
            sortedProviders,
            providerTestCases,
            providerParamScores,
            stats,
            formatNum: (n, decimals = 2) => (n || 0).toFixed(decimals),
        }

        const html = await ejs.renderFile(templatePath, templateData)
        console.log("Rendered HTML from template")

        const outputPath = path.join(__dirname, '../leaderboard.html')
        await fs.writeFile(outputPath, html)
        
        console.log(`Success! Leaderboard saved as leaderboard.html.`)

    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error("Error: 'template.ejs' or 'report.json' not found. Please ensure they are in the correct directories.")
        } else {
            console.error("An unexpected error occurred:", error)
        }
        process.exit(1)
    }
}

await generateReport()
