resource "helm_release" "external_secrets" {
  name             = "external-secrets"
  repository       = "https://charts.external-secrets.io"
  chart            = "external-secrets"
  version          = "0.9.18"
  namespace        = "external-secrets"
  create_namespace = true

  values = [
    yamlencode({
      installCRDs = true
      serviceAccount = {
        annotations = {
          "eks.amazonaws.com/role-arn" = aws_iam_role.eso_irsa.arn
        }
      }
    })
  ]

  depends_on = [aws_eks_cluster.main]
}

resource "helm_release" "external_dns" {
  name             = "external-dns"
  repository       = "https://kubernetes-sigs.github.io/external-dns/"
  chart            = "external-dns"
  version          = "1.14.4"
  namespace        = "external-dns"
  create_namespace = true

  values = [
    yamlencode({
      serviceAccount = {
        annotations = {
          "eks.amazonaws.com/role-arn" = aws_iam_role.external_dns_irsa.arn
        }
      }
      domainFilters = [var.domain_name]
      policy        = "sync"
      txtOwnerId    = var.cluster_name
      provider      = "aws"
    })
  ]

  depends_on = [aws_eks_cluster.main]
}

resource "helm_release" "argo_cd" {
  name             = "argo-cd"
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-cd"
  version          = "6.7.18"
  namespace        = "argocd"
  create_namespace = true

  values = [
    yamlencode({
      server = {
        extraArgs = ["--insecure"]
      }
    })
  ]

  depends_on = [aws_eks_cluster.main]
}

resource "helm_release" "argo_rollouts" {
  name             = "argo-rollouts"
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-rollouts"
  version          = "2.37.0"
  namespace        = "argo-rollouts"
  create_namespace = true

  values = [
    yamlencode({
      dashboard = {
        enabled = true
      }
    })
  ]

  depends_on = [aws_eks_cluster.main]
}

resource "helm_release" "kube_prometheus_stack" {
  name             = "kube-prometheus-stack"
  repository       = "https://prometheus-community.github.io/helm-charts"
  chart            = "kube-prometheus-stack"
  version          = "58.2.2"
  namespace        = "monitoring"
  create_namespace = true

  values = [
    yamlencode({
      prometheus = {
        prometheusSpec = {
          serviceMonitorSelectorNilUsesHelmValues = false
          podMonitorSelectorNilUsesHelmValues     = false
        }
      }
      grafana = {
        additionalDataSources = [
          {
            name      = "Loki"
            type      = "loki"
            url       = "http://loki.monitoring.svc.cluster.local:3100"
            access    = "proxy"
            isDefault = false
          },
          {
            name      = "OpenCost"
            type      = "prometheus"
            url       = "http://opencost.monitoring.svc.cluster.local:9090"
            access    = "proxy"
            isDefault = false
          }
        ]
      }
    })
  ]

  depends_on = [aws_eks_cluster.main]
}

resource "helm_release" "loki" {
  name             = "loki"
  repository       = "https://grafana.github.io/helm-charts"
  chart            = "loki"
  version          = "6.6.2"
  namespace        = "monitoring"
  create_namespace = true

  values = [
    yamlencode({
      deploymentMode = "SingleBinary"
      singleBinary = {
        replicas = 1
      }
      backend = {
        replicas = 0
      }
      read = {
        replicas = 0
      }
      write = {
        replicas = 0
      }
      ingester = {
        replicas = 0
      }
      querier = {
        replicas = 0
      }
      queryFrontend = {
        replicas = 0
      }
      queryScheduler = {
        replicas = 0
      }
      distributor = {
        replicas = 0
      }
      compactor = {
        replicas = 0
      }
      indexGateway = {
        replicas = 0
      }
      ruler = {
        replicas = 0
      }
      loki = {
        auth_enabled  = false
        useTestSchema = true
        commonConfig = {
          replication_factor = 1
        }
        storage = {
          type = "filesystem"
          filesystem = {
            chunks_directory = "/var/loki/chunks"
            rules_directory  = "/var/loki/rules"
          }
        }
      }
    })
  ]

  depends_on = [aws_eks_cluster.main, helm_release.kube_prometheus_stack]
}

resource "helm_release" "alloy" {
  name             = "alloy"
  repository       = "https://grafana.github.io/helm-charts"
  chart            = "alloy"
  version          = "0.5.0"
  namespace        = "monitoring"
  create_namespace = true

  values = [
    yamlencode({
      alloy = {
        configMap = {
          content = <<-EOT
            discovery.kubernetes "pods" {
              role = "pod"
            }

            discovery.relabel "pod_logs" {
              targets = discovery.kubernetes.pods.targets

              rule {
                source_labels = ["__meta_kubernetes_namespace"]
                target_label  = "namespace"
              }

              rule {
                source_labels = ["__meta_kubernetes_pod_name"]
                target_label  = "pod"
              }

              rule {
                source_labels = ["__meta_kubernetes_pod_container_name"]
                target_label  = "container"
              }

              rule {
                source_labels = ["__meta_kubernetes_pod_label_app"]
                target_label  = "app"
              }
            }

            loki.source.kubernetes "pod_logs" {
              targets    = discovery.relabel.pod_logs.output
              forward_to = [loki.write.endpoint.receiver]
            }

            loki.write "endpoint" {
              endpoint {
                url = "http://loki.monitoring.svc.cluster.local:3100/loki/api/v1/push"
              }
            }
          EOT
        }
      }
    })
  ]

  depends_on = [aws_eks_cluster.main, helm_release.loki]
}

resource "helm_release" "opencost" {
  name             = "opencost"
  repository       = "https://opencost.github.io/opencost-helm-chart"
  chart            = "opencost"
  version          = "1.23.0"
  namespace        = "monitoring"
  create_namespace = true

  values = [
    yamlencode({
      opencost = {
        prometheus = {
          internal = {
            serviceName   = "kube-prometheus-stack-prometheus"
            namespaceName = "monitoring"
            port          = 9090
          }
        }
      }
    })
  ]

  depends_on = [aws_eks_cluster.main, helm_release.kube_prometheus_stack]
}
