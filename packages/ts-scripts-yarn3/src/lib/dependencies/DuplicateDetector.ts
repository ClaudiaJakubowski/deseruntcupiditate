import chalk from 'chalk'
// eslint-disable-next-line import/no-internal-modules
import uniq from 'lodash/uniq'
import { EOL } from 'os'

import { multiLineToJSONArray } from '../jsonFormatters'

interface ChildFields {
  descriptor: string
  locator: string
}

const trimVirtualMeta = (value: string): string => {
  const virtualParts = value.split('virtual:')
  if (virtualParts.length > 1) {
    const hashParts = virtualParts[1].split('#')
    return virtualParts[0] + hashParts[1]
  } else {
    return value
  }
}

const trimObjectDependencyVirtualMeta = (obj: Record<string, ChildFields>): Record<string, ChildFields> => {
  const resultObj: Record<string, ChildFields> = {}
  Object.entries(obj).forEach(([key, value]) => {
    resultObj[trimVirtualMeta(key)] = {
      descriptor: trimVirtualMeta(value.descriptor),
      locator: trimVirtualMeta(value.locator),
    }
  })
  return resultObj
}

const trimDependencyVirtualMeta = (dependencies: DependencyEntries): DependencyEntries => {
  return dependencies.map((dependency) => {
    return { children: trimObjectDependencyVirtualMeta(dependency.children), value: trimVirtualMeta(dependency.value) }
  })
}

interface DependencyEntry {
  children: Record<string, ChildFields>
  value: string
}

type DependencyEntries = DependencyEntry[]

interface Results {
  currentVersion: string | undefined
  dependency: string
  duplicateVersions: string[]
}

export class DuplicateDetector {
  private dependency: string
  private dependencyEntries: DependencyEntries

  constructor(output: string, dependency: string) {
    this.dependency = dependency
    this.dependencyEntries = trimDependencyVirtualMeta(multiLineToJSONArray(output))
  }

  public detect() {
    const result = this.dependencyEntries.reduce(this.detectReducer, this.resultsFactory(this.dependency))
    if (result.duplicateVersions.length) {
      console.log(chalk.yellow(`${EOL}Duplicates found for: ${this.dependency}`))
      console.log(chalk.grey(`  ${result.duplicateVersions.toString().replaceAll(',', `${EOL}  `)}`, EOL))
      return 1
    } else {
      console.log(`${this.dependency} - OK`)
      return 0
    }
  }

  private detectReducer(acc: Results, entry: DependencyEntry) {
    const version = Object.entries(entry.children).map(([k]) => k)[0]

    if (!acc.currentVersion) {
      acc.currentVersion = version
      return acc
    }

    if (acc.currentVersion && acc.currentVersion !== version && !version.includes('@virtual:')) {
      // if first duplicate, push the current version as the first duplicate
      if (acc.duplicateVersions.length === 0) {
        acc.duplicateVersions.push(acc.currentVersion)
      }
      acc.duplicateVersions.push(version)
      acc.duplicateVersions = uniq(acc.duplicateVersions)
    }
    return acc
  }

  private resultsFactory = (dependency: string): Results => ({ currentVersion: undefined, dependency, duplicateVersions: [] })
}
