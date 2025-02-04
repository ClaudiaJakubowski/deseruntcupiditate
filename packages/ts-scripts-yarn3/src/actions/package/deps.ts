/* eslint-disable max-statements */
import chalk from 'chalk'
import depcheck, { special } from 'depcheck'
import { existsSync, readFileSync } from 'fs'

export const packageDeps = async () => {
  const pkg = process.env.INIT_CWD
  const pkgName = process.env.npm_package_name

  const rawIgnore = existsSync(`${pkg}/.depcheckrc`)
    ? readFileSync(`${pkg}/.depcheckrc`, { encoding: 'utf8' }).replace('ignores:', '"ignores":')
    : undefined
  let ignoreMatches: string[] = []
  try {
    ignoreMatches = rawIgnore ? (JSON.parse(`{${rawIgnore}}`).ignores as string[]) : []
  } catch (ex) {
    const error = ex as Error
    console.log(`${pkgName} [${error.message}] Failed to parse .depcheckrc [${rawIgnore}]`)
  }

  ignoreMatches.push('@xylabs/ts-scripts-yarn3')
  ignoreMatches.push('@xylabs/tsconfig')
  ignoreMatches.push('@xylabs/tsconfig-dom')
  ignoreMatches.push('@xylabs/tsconfig-react')
  ignoreMatches.push('@xylabs/tsconfig-jest')
  ignoreMatches.push('typescript')

  const unusedList = await Promise.all([
    depcheck(`${pkg}/.`, { ignoreMatches, ignorePatterns: ['*.stories.*', '*.spec.*', '*.d.ts', 'dist'] }),
    depcheck(`${pkg}/.`, {
      ignoreMatches,
      ignorePatterns: ['*.ts', '*.d.ts', 'dist'],
      specials: [special.eslint, special.babel, special.bin, special.prettier, special.jest, special.mocha],
    }),
  ])

  const unusedCode = unusedList[0]
  const unusedTests = unusedList[1]

  const unused: depcheck.Results = {
    ...unusedCode,
    /* we only reports the unused devDeps if both are not using it */
    devDependencies: unusedTests.devDependencies.filter((value) => !!unusedCode.devDependencies.find((devValue) => devValue === value)),
  }

  const errorCount =
    unused.dependencies.length +
    unused.devDependencies.length +
    Object.entries(unused.invalidDirs).length +
    Object.entries(unused.invalidFiles).length +
    Object.entries(unused.missing).length

  if (errorCount > 0) {
    console.log(`Deps [${pkgName}]`)
  } else {
    console.log(`Deps [${pkgName}] - Ok`)
  }

  if (unused.dependencies.length) {
    const message = [chalk.yellow(`${unused.dependencies.length} Unused dependencies`)]
    unused.dependencies.forEach((value) => message.push(chalk.gray(`  ${value}`)))
    console.log(message.join('\n'))
  }

  if (unused.devDependencies.length) {
    const message = [chalk.yellow(`${unused.devDependencies.length} Unused devDependencies`)]
    unused.devDependencies.forEach((value) => message.push(chalk.gray(`  ${value}`)))
    console.log(message.join('\n'))
  }

  if (Object.entries(unused.invalidDirs).length) {
    Object.entries(unused.invalidDirs).forEach(([key, value]) => console.warn(chalk.gray(`Invalid Dir: ${key}: ${value}`)))
  }

  if (Object.entries(unused.invalidFiles).length) {
    Object.entries(unused.invalidFiles).forEach(([key, value]) => console.warn(chalk.gray(`Invalid File: ${key}: ${value}`)))
  }

  if (Object.entries(unusedCode.missing).length) {
    const message = [chalk.yellow(`${Object.entries(unusedCode.missing).length} Missing dependencies`)]
    Object.entries(unusedCode.missing).forEach(([key, value]) => {
      message.push(`${key}`)
      message.push(chalk.gray(`  ${value.pop()}`))
    })
    console.log(chalk.yellow(message.join('\n')))
  }

  if (Object.entries(unusedTests.missing).length) {
    const message = [chalk.yellow(`${Object.entries(unusedTests.missing).length} Missing devDependencies`)]
    Object.entries(unusedTests.missing).forEach(([key, value]) => {
      message.push(`${key}`)
      message.push(chalk.gray(`  ${value.pop()}`))
    })
    console.log(chalk.yellow(message.join('\n')))
  }

  return errorCount
}
