#!/usr/bin/env node
import { execSync } from 'child_process'

import { safeExit } from './lib'
safeExit(() => {
  console.log(`Dead [${process.cwd()}]`)
  execSync('yarn dlx -q ts-prune', { stdio: 'inherit' })
})
