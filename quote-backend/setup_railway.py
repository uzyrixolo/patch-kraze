#!/usr/bin/env python3
"""
One-shot Railway setup for the Patch Kraze quote backend.

Run:  python3 /Users/zolo/patch-kraze/quote-backend/setup_railway.py

Creates the Railway project + service from the GitHub repo, sets the root
directory to quote-backend/, adds env vars (prompts for your Shopify shpat_
token so it never leaves your machine), and generates the public domain.
"""

import json
import sys
import urllib.request
import getpass

RAILWAY_TOKEN = "e082fae0-42c8-40ad-813a-ff4544aedcaa"
API = "https://backboard.railway.com/graphql/v2"
REPO = "uzyrixolo/patch-kraze"


def gql(query, variables=None):
    req = urllib.request.Request(
        API,
        data=json.dumps({"query": query, "variables": variables or {}}).encode(),
        headers={
            "Authorization": f"Bearer {RAILWAY_TOKEN}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        out = json.loads(r.read())
    if out.get("errors"):
        raise RuntimeError(json.dumps(out["errors"], indent=2))
    return out["data"]


def main():
    # 0. Auth check
    me = gql("query { me { name email } }")["me"]
    print(f"[ok] Authenticated as {me.get('name') or me.get('email')}")

    # 1. Shopify app credentials (stay local; sent only to Railway)
    client_id = input("Paste your Shopify app Client ID: ").strip()
    client_secret = getpass.getpass("Paste your Shopify app Client Secret (shpss_...): ").strip()
    if not client_secret.startswith("shpss_"):
        print("[!] That doesn't look like a shpss_ secret. Continuing anyway...")

    # 2. Project
    proj = gql(
        """mutation($input: ProjectCreateInput!) {
             projectCreate(input: $input) {
               id
               environments { edges { node { id name } } }
             }
           }""",
        {"input": {"name": "patch-kraze-quote"}},
    )["projectCreate"]
    project_id = proj["id"]
    env_id = proj["environments"]["edges"][0]["node"]["id"]
    print(f"[ok] Project created: {project_id}")

    # 3. Service from GitHub repo
    try:
        svc = gql(
            """mutation($input: ServiceCreateInput!) {
                 serviceCreate(input: $input) { id name }
               }""",
            {"input": {"projectId": project_id, "name": "quote-backend",
                       "branch": "main", "source": {"repo": REPO}}},
        )["serviceCreate"]
    except RuntimeError as e:
        if "branch" in str(e):
            svc = gql(
                """mutation($input: ServiceCreateInput!) {
                     serviceCreate(input: $input) { id name }
                   }""",
                {"input": {"projectId": project_id, "name": "quote-backend",
                           "source": {"repo": REPO}}},
            )["serviceCreate"]
        else:
            print("\n[!] Service creation failed. If the error mentions GitHub,")
            print("    open railway.app, and connect your GitHub account")
            print("    (authorize 'uzyrixolo'), then re-run this script.\n")
            raise
    service_id = svc["id"]
    print(f"[ok] Service created from {REPO}: {service_id}")

    # 4. Root directory -> quote-backend
    gql(
        """mutation($serviceId: String!, $environmentId: String!, $input: ServiceInstanceUpdateInput!) {
             serviceInstanceUpdate(serviceId: $serviceId, environmentId: $environmentId, input: $input)
           }""",
        {"serviceId": service_id, "environmentId": env_id,
         "input": {"rootDirectory": "quote-backend"}},
    )
    print("[ok] Root directory set to quote-backend/")

    # 5. Environment variables
    for name, value in [
        ("SHOPIFY_SHOP", "patchkraze.myshopify.com"),
        ("SHOPIFY_CLIENT_ID", client_id),
        ("SHOPIFY_CLIENT_SECRET", client_secret),
        ("ALLOWED_ORIGINS", "https://patchkraze.com,https://www.patchkraze.com"),
    ]:
        gql(
            """mutation($input: VariableUpsertInput!) {
                 variableUpsert(input: $input)
               }""",
            {"input": {"projectId": project_id, "environmentId": env_id,
                       "serviceId": service_id, "name": name, "value": value}},
        )
        print(f"[ok] Variable set: {name}")

    # 6. Public domain
    dom = gql(
        """mutation($input: ServiceDomainCreateInput!) {
             serviceDomainCreate(input: $input) { domain }
           }""",
        {"input": {"serviceId": service_id, "environmentId": env_id}},
    )["serviceDomainCreate"]
    domain = dom["domain"]
    print(f"[ok] Public domain: https://{domain}")

    # 7. Trigger a (re)deploy so root-directory change takes effect
    try:
        gql(
            """mutation($serviceId: String!, $environmentId: String!) {
                 serviceInstanceRedeploy(serviceId: $serviceId, environmentId: $environmentId)
               }""",
            {"serviceId": service_id, "environmentId": env_id},
        )
        print("[ok] Deploy triggered")
    except RuntimeError:
        print("[i] Could not trigger redeploy via API - if the first build fails,")
        print("    hit 'Redeploy' in the Railway dashboard once.")

    print("\n=== DONE ===")
    print(f"Backend URL: https://{domain}")
    print("Paste that URL back to Claude to wire up the quote form.")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n[ERROR] {e}", file=sys.stderr)
        sys.exit(1)
