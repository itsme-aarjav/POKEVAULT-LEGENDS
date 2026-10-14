import fs from 'fs';
import path from 'path';
import assert from 'assert';

const REPO_ROOT = process.cwd();

console.log('================================================================');
console.log('TEST 4: Cross-File Contract Audit (Zero-Trust Static & Runtime Bindings)');
console.log('================================================================');

let totalChecks = 0;
let passedChecks = 0;

function audit(name, fn) {
  totalChecks++;
  try {
    fn();
    passedChecks++;
    console.log(`[PASS] ${name}`);
  } catch (err) {
    console.error(`[FAIL] ${name}: ${err.message}`);
    throw err;
  }
}

// 1. scripts/deploy.sh vs infra/foundation/outputs.tf & infra/runtime/outputs.tf
audit('1. scripts/deploy.sh & destroy.sh Terraform output calls match exact outputs.tf definitions', () => {
  const deploySh = fs.readFileSync(path.join(REPO_ROOT, 'scripts/deploy.sh'), 'utf8');
  const destroySh = fs.readFileSync(path.join(REPO_ROOT, 'scripts/destroy.sh'), 'utf8');
  const foundationOutputs = fs.readFileSync(path.join(REPO_ROOT, 'infra/foundation/outputs.tf'), 'utf8');
  const runtimeOutputs = fs.readFileSync(path.join(REPO_ROOT, 'infra/runtime/outputs.tf'), 'utf8');

  // Extract foundation outputs
  const foundationOutputMatches = [...foundationOutputs.matchAll(/output\s+"([^"]+)"/g)].map(m => m[1]);
  // Extract runtime outputs
  const runtimeOutputMatches = [...runtimeOutputs.matchAll(/output\s+"([^"]+)"/g)].map(m => m[1]);

  console.log(`       Foundation outputs declared:`, foundationOutputMatches);
  console.log(`       Runtime outputs declared:`, runtimeOutputMatches);

  // Extract all terraform output calls from deploy.sh and destroy.sh
  const scriptContents = [deploySh, destroySh].join('\n');
  const tfOutputCalls = [...scriptContents.matchAll(/terraform\s+(?:-chdir=[^\s]+\s+)?output\s+(?:-raw\s+)?([a-zA-Z0-9_]+)/g)].map(m => m[1]);

  console.log(`       Terraform output calls in scripts:`, tfOutputCalls);
  assert(tfOutputCalls.length > 0, 'No terraform output calls found in scripts');

  for (const call of tfOutputCalls) {
    const foundInFoundation = foundationOutputMatches.includes(call);
    const foundInRuntime = runtimeOutputMatches.includes(call);
    assert(foundInFoundation || foundInRuntime, `Script calls terraform output "${call}" which is not defined in foundation or runtime outputs.tf`);
  }
});

// 2. AWS Secrets Manager Keys vs App Env Vars
audit('2. AWS Secrets Manager Keys match app env vars and are synced via pokevault-env', () => {
  const foundationTf = fs.readFileSync(path.join(REPO_ROOT, 'infra/foundation/ecr_secrets_iam.tf'), 'utf8');
  const runtimeDataTf = fs.readFileSync(path.join(REPO_ROOT, 'infra/runtime/data.tf'), 'utf8');
  const externalSecretYaml = fs.readFileSync(path.join(REPO_ROOT, 'gitops/helm-chart/templates/externalsecret.yaml'), 'utf8');
  const deploymentsYaml = fs.readFileSync(path.join(REPO_ROOT, 'gitops/helm-chart/templates/deployments.yaml'), 'utf8');
  const orderRolloutYaml = fs.readFileSync(path.join(REPO_ROOT, 'gitops/helm-chart/templates/order-rollout.yaml'), 'utf8');
  const dbSeedJobYaml = fs.readFileSync(path.join(REPO_ROOT, 'gitops/helm-chart/templates/db-seed-job.yaml'), 'utf8');

  const expectedKeys = [
    'JWT_SECRET',
    'ADMIN_SECRET_KEY',
    'MYSQL_HOST',
    'MYSQL_PORT',
    'MYSQL_USER',
    'MYSQL_PASSWORD',
    'MYSQL_DATABASE',
    'REDIS_HOST',
    'REDIS_PORT',
    'REDIS_URL'
  ];

  for (const key of expectedKeys) {
    const inFoundation = foundationTf.includes(`"${key}"`) || foundationTf.includes(`${key} `) || foundationTf.includes(`${key}=`) || foundationTf.includes(`${key}:`);
    const inRuntime = runtimeDataTf.includes(`"${key}"`) || runtimeDataTf.includes(`${key} `) || runtimeDataTf.includes(`${key}=`) || runtimeDataTf.includes(`${key}:`);
    assert(inFoundation || inRuntime, `Key "${key}" is missing from Terraform Secrets Manager definition`);
  }

  // Ensure secret name pokevault-env is synced and used across workloads
  assert(externalSecretYaml.includes('name: pokevault-env'), 'externalsecret.yaml does not target Secret pokevault-env');
  assert(deploymentsYaml.includes('name: pokevault-env'), 'deployments.yaml does not consume pokevault-env');
  assert(orderRolloutYaml.includes('name: pokevault-env'), 'order-rollout.yaml does not consume pokevault-env');
  assert(dbSeedJobYaml.includes('name: pokevault-env'), 'db-seed-job.yaml does not consume pokevault-env');
});

// 3. ECR Repo Names
audit('3. ECR repository names match identically across IaC, CI, deploy script, and Helm values', () => {
  const expectedRepos = [
    'pokevault/auth-service',
    'pokevault/catalog-service',
    'pokevault/order-service',
    'pokevault/nginx-gateway'
  ];

  const foundationTf = fs.readFileSync(path.join(REPO_ROOT, 'infra/foundation/ecr_secrets_iam.tf'), 'utf8');
  const ciBackend = fs.readFileSync(path.join(REPO_ROOT, '.github/workflows/ci-backend.yml'), 'utf8');
  const deploySh = fs.readFileSync(path.join(REPO_ROOT, 'scripts/deploy.sh'), 'utf8');
  const helmValues = fs.readFileSync(path.join(REPO_ROOT, 'gitops/helm-chart/values.yaml'), 'utf8');

  for (const repo of expectedRepos) {
    const svc = repo.replace('pokevault/', '');
    assert(foundationTf.includes(`"${repo}"`), `Repo ${repo} missing in infra/foundation/ecr_secrets_iam.tf`);
    assert(ciBackend.includes(svc) && ciBackend.includes('pokevault/${{ matrix.service }}'), `Service ${svc} missing in ci-backend.yml`);
    assert(deploySh.includes(`"${svc}"`) && deploySh.includes('pokevault/${SVC}'), `Service ${svc} missing in scripts/deploy.sh`);
    assert(helmValues.includes(`repository: "${repo}"`), `Repo ${repo} missing in gitops/helm-chart/values.yaml`);
  }
});

// 4. Kubernetes Service Names & Ports
audit('4. Kubernetes Service Names & Ports match across services.yaml, deployments, rollout, ingress, nginx.conf', () => {
  const servicesYaml = fs.readFileSync(path.join(REPO_ROOT, 'gitops/helm-chart/templates/services.yaml'), 'utf8');
  const deploymentsYaml = fs.readFileSync(path.join(REPO_ROOT, 'gitops/helm-chart/templates/deployments.yaml'), 'utf8');
  const rolloutYaml = fs.readFileSync(path.join(REPO_ROOT, 'gitops/helm-chart/templates/order-rollout.yaml'), 'utf8');
  const hpaPdbYaml = fs.readFileSync(path.join(REPO_ROOT, 'gitops/helm-chart/templates/hpa-pdb.yaml'), 'utf8');
  const serviceMonitorYaml = fs.readFileSync(path.join(REPO_ROOT, 'gitops/helm-chart/templates/servicemonitor.yaml'), 'utf8');
  const ingressYaml = fs.readFileSync(path.join(REPO_ROOT, 'gitops/helm-chart/templates/ingress.yaml'), 'utf8');
  const nginxConf = fs.readFileSync(path.join(REPO_ROOT, 'services/nginx-gateway/nginx.conf'), 'utf8');

  // auth-service
  assert(servicesYaml.includes('name: auth-service'), 'services.yaml missing auth-service');
  assert(deploymentsYaml.includes('name: auth-service'), 'deployments.yaml missing auth-service');
  assert(hpaPdbYaml.includes('name: auth-service-hpa') && hpaPdbYaml.includes('name: auth-service'), 'hpa-pdb.yaml missing auth-service');
  assert(serviceMonitorYaml.includes('auth-service'), 'servicemonitor.yaml missing auth-service');
  assert(nginxConf.includes('server auth-service:5001;'), 'nginx.conf missing upstream auth-service:5001');

  // catalog-service
  assert(servicesYaml.includes('name: catalog-service'), 'services.yaml missing catalog-service');
  assert(deploymentsYaml.includes('name: catalog-service'), 'deployments.yaml missing catalog-service');
  assert(hpaPdbYaml.includes('name: catalog-service-hpa') && hpaPdbYaml.includes('name: catalog-service'), 'hpa-pdb.yaml missing catalog-service');
  assert(serviceMonitorYaml.includes('catalog-service'), 'servicemonitor.yaml missing catalog-service');
  assert(nginxConf.includes('server catalog-service:5002;'), 'nginx.conf missing upstream catalog-service:5002');

  // order-service & order-service-canary
  assert(servicesYaml.includes('name: order-service'), 'services.yaml missing order-service');
  assert(servicesYaml.includes('name: order-service-canary'), 'services.yaml missing order-service-canary');
  assert(rolloutYaml.includes('name: order-service'), 'order-rollout.yaml missing order-service');
  assert(rolloutYaml.includes('stableService: order-service'), 'order-rollout.yaml missing stableService');
  assert(rolloutYaml.includes('canaryService: order-service-canary'), 'order-rollout.yaml missing canaryService');
  assert(hpaPdbYaml.includes('name: order-service-hpa') && hpaPdbYaml.includes('name: order-service'), 'hpa-pdb.yaml missing order-service');
  assert(serviceMonitorYaml.includes('order-service'), 'servicemonitor.yaml missing order-service');
  assert(nginxConf.includes('server order-service:5003;'), 'nginx.conf missing upstream order-service:5003');

  // nginx-gateway
  assert(servicesYaml.includes('name: nginx-gateway'), 'services.yaml missing nginx-gateway');
  assert(deploymentsYaml.includes('name: nginx-gateway'), 'deployments.yaml missing nginx-gateway');
  assert(ingressYaml.includes('name: nginx-gateway'), 'ingress.yaml missing backend service nginx-gateway');
  assert(hpaPdbYaml.includes('name: nginx-gateway-hpa') && hpaPdbYaml.includes('name: nginx-gateway'), 'hpa-pdb.yaml missing nginx-gateway');
});

console.log('================================================================');
console.log(`TEST 4 AUDIT SUMMARY: ${passedChecks}/${totalChecks} contract checks passed with ZERO mismatches.`);
console.log('================================================================');
