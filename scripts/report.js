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
            .sort((a, b) => (b.metrics?.score || 0) - (a.metrics?.score || 0))

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

        const templatePath = path.join(__dirname, 'template.ejs')
        const templateData = {
            evalId,
            timestamp,
            sortedProviders,
            providerTestCases,
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
            console.error("Error: 'template.ejs' not found. Please ensure it is in the same directory.")
        } else {
            console.error("An unexpected error occurred:", error)
        }
        process.exit(1)
    }
}

await generateReport()
