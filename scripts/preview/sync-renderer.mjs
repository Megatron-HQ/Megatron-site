import { syncRenderer } from './renderer.mjs'

if (!process.argv[2])
  throw new Error('Usage: npm run preview:sync -- <app-repository-path>')
const manifest = await syncRenderer(process.argv[2])
console.log(
  `Imported Megatron ${manifest.version} at ${manifest.revision}. Review the snapshot and rerun visual verification.`
)
