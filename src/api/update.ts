import { prepareRepo, repos } from '../utils/repo'

export type UpdateOption = {}

export default async function UpdateAction() {
  await prepareRepo(repos.template.subp, repos.template.url)
  return true
}
