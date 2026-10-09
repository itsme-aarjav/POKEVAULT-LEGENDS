# 🛠️ PokéVault Legends — Enterprise Ansible Automation

## 📌 Overview
In modern cloud-native architectures, infrastructure is provisioned declaratively via **Terraform (IaC)**, and workloads are deployed via **GitOps (ArgoCD)**. 

**Ansible** serves as the **Day-2 Operations, Cluster Auditing, and Automation Engine** in this platform:
* Automated smoke testing & health validation of multi-namespace microservices.
* Ingress and TLS endpoint auditing.
* Drift detection and node pool readiness verification.
* Security compliance checks across production workloads.

---

## 🚀 Running the Playbooks

### 1. Cluster Health & Workload Audit Playbook
Executes an automated end-to-end audit verifying AWS EKS cluster health, Karpenter nodes, all 10 microservice pods, ALB Ingresses, and the K8sGPT AIOps operator:

```bash
ansible-playbook -i infra/ansible/inventory.ini infra/ansible/playbooks/cluster_audit.yml
```

---

## 📁 Structure
```
infra/ansible/
├── ansible.cfg                    # Optimized Ansible runtime configuration
├── inventory.ini                  # Control plane inventory definition
├── playbooks/
│   └── cluster_audit.yml          # End-to-end cluster health audit playbook
└── README.md                      # Operational guide
```
