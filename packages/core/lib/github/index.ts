import { Octokit } from "@octokit/rest";
import { settings } from "@heiso/core/config";

const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO } = await settings();
if (!GITHUB_TOKEN) {
  throw new Error("GITHUB_TOKEN is required");
}

const octokit = new Octokit({ auth: GITHUB_TOKEN });

export async function createRepoFromTemplate({
  templateOwner,
  templateRepo,
  newRepoName,
  owner,
  description = "A repo generated from template",
  privateRepo = false,
  includeAllBranches = false,
}: {
  templateOwner: string; // Template repository owner
  templateRepo: string; // Template repository name
  newRepoName: string; // New repository name
  owner: string; // User or organization to create the repository under
  description?: string; // Repository description
  privateRepo?: boolean; // Whether the repository is private
  includeAllBranches?: boolean; // Whether to include all branches (true = copy all, false = copy default branch only)
}) {
  const res = await octokit.rest.repos.createUsingTemplate({
    template_owner: templateOwner,
    template_repo: templateRepo,
    owner: owner,
    name: newRepoName,
    description,
    private: privateRepo,
    include_all_branches: includeAllBranches,
  });

  return res;
}

export async function listFiles({
  owner,
  repo,
  branch = "main",
  dirPath,
}: {
  owner: string;
  repo: string;
  branch: string;
  dirPath: string;
}) {
  const { data } = await octokit.repos.getContent({
    owner,
    repo,
    path: dirPath,
    ref: branch,
  });
  return data;
}

export async function getContent({
  owner,
  repo,
  branch = "main",
  filePath,
}: {
  owner: string;
  repo: string;
  branch: string;
  filePath: string;
}) {
  const { data: fileData } = await octokit.repos.getContent({
    owner,
    repo,
    path: filePath,
    ref: branch,
  });

  // const originalContent = Buffer.from(
  //   (fileData as any).content,
  //   'base64'
  // ).toString();

  return fileData;
}

export async function updateFile({
  owner,
  repo,
  branch = "main",
  sha,
  filePath,
  content = "Update via API",
  message,
}: {
  owner: string;
  repo: string;
  branch: string;
  sha?: string;
  filePath: string;
  content: string;
  message: string;
}) {
  const encodedContent = Buffer.from(content).toString("base64");
  const res = await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: filePath,
    message,
    content: encodedContent,
    sha,
    branch,
  });

  return res;
}
