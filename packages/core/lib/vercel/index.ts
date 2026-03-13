import { settings } from "@heiso/core/config";

const { VERCEL_TOKEN } = await settings();
if (!VERCEL_TOKEN) {
  throw new Error("VERCEL_TOKEN is required");
}


/**
 * 觸發 Vercel 專案的 On-Demand Revalidation
 *
 * @param projectId Vercel Project ID (prj_xxx)
 * @param paths 要 revalidate 的路徑陣列
 * @returns 是否成功
 */
export async function revalidatePaths(
  projectId: string,
  paths: string[],
): Promise<{ success: boolean; error?: string }> {
  const token = VERCEL_TOKEN;

  try {
    // 使用 Vercel API 進行 revalidation
    // https://vercel.com/docs/rest-api/endpoints#purge-content-from-vercel-s-cache
    const response = await fetch(
      `https://api.vercel.com/v1/projects/${projectId}/purge-cache`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paths,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Vercel revalidation failed:", error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error("Vercel revalidation error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * 透過網站的 revalidate API 觸發 ISR 更新
 *
 * @param baseUrl 網站基底網址
 * @param path 要 revalidate 的路徑
 * @param secret revalidation secret (用於驗證)
 * @returns 是否成功
 */
export async function revalidateViaApi(
  baseUrl: string,
  path: string,
  secret?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = new URL("/api/revalidate", baseUrl);
    url.searchParams.set("path", path);
    if (secret) {
      url.searchParams.set("secret", secret);
    }

    const response = await fetch(url.toString(), {
      method: "POST",
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
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
