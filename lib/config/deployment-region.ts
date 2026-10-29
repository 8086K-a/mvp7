export type DeploymentRegion = "CN" | "INTL";

export function resolveDeploymentRegion(): DeploymentRegion {
  const rawRegion =
    process.env.DEPLOYMENT_REGION ||
    process.env.NEXT_PUBLIC_DEPLOYMENT_REGION ||
    "CN";

  const region = rawRegion.toUpperCase();

  if (region === "INTL") {
    return "INTL";
  }

  return "CN";
}

