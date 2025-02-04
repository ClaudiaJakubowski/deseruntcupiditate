import { readFileSync } from 'fs'

import { defaultBuildConfig } from './defaultBuildConfig'

const getGeneralTypescriptConfig = (location: string) => {
  let generalConfig: string | undefined
  try {
    generalConfig = readFileSync(`${location}/tsconfig.json`, { encoding: 'utf8' })
  } catch (ex) {
    return false
  }
  return JSON.parse(generalConfig)
}

export const createBuildConfig = (
  location: string,
  module: 'ESNext' | 'CommonJS',
  target: 'ESNext' | 'ES6',
  outDirSuffix: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> | undefined => {
  const generalConfigObject = getGeneralTypescriptConfig(location)
  if (generalConfigObject === false) {
    return undefined
  }
  return {
    ...generalConfigObject,
    compilerOptions: {
      ...defaultBuildConfig.compilerOptions,
      ...(generalConfigObject.compilerOptions ?? {}),
      module,
      outDir: `./${generalConfigObject.compilerOptions?.outDir ?? 'dist'}/${outDirSuffix}`,
      target,
    },
    exclude: [...(generalConfigObject.exclude ?? []), ...defaultBuildConfig.exclude],
    include: [...(generalConfigObject.include ?? []), ...defaultBuildConfig.include],
  }
}
