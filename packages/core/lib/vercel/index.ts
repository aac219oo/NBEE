import { settings } from "@heiso/core/config";

const { VERCEL_TOKEN } = await settings();
if (!VERCEL_TOKEN) {
  throw new Error("VERCEL_TOKEN is required");
}

export async function deployFromGitHubAndCheck({
  projectName,
  repoId,
  branch,
  repo,
  target,
}: {
  projectName: string;
  repoId: string;
  branch: string;
  repo: string;
  target: "staging" | "production";
}) {
  const deployRes = await fetch("https://api.vercel.com/v13/deployments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: projectName,
      gitSource: {
        type: "github",
        repoId: repoId,
        ref: branch,
        repo,
      },
      target,
    }),
  }).then((response) => response.json());

  const deploymentId = deployRes.data.id;
  console.log("🚀 Deployment initiated successfully: ", deployRes.data.url);

  let done = false;
  while (!done) {
    const { data: deployStatus } = await fetch(
      `https://api.vercel.com/v13/deployments/${deploymentId}`,
      {
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
        },
      },
    ).then((res) => res.json());

    console.log(`🔄 Current status: ${deployStatus.readyState}`);

    if (deployStatus.readyState === "READY") {
      console.log(`✅ Deployment successful: ${deployStatus.url}`);
      done = true;
    } else if (
      deployStatus.readyState === "ERROR" ||
      deployStatus.readyState === "CANCELED"
    ) {
      console.error(`❌ Deployment failed: ${deployStatus.readyState}`);
      done = true;
    } else {
      // Wait a few seconds before checking again
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}
