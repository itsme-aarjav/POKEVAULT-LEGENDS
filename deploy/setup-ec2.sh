#!/usr/bin/env bash
# ==============================================================================
# POKÉVAULT LEGENDS — AWS EC2 UBUNTU SERVER PROVISIONING SCRIPT
# Run on fresh Ubuntu 22.04 / 24.04 LTS instance:
#   chmod +x deploy/setup-ec2.sh && sudo ./deploy/setup-ec2.sh
# ==============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=================================================================${NC}"
echo -e "${BLUE}⚡ POKÉVAULT LEGENDS — EC2 SERVER PROVISIONER${NC}"
echo -e "${BLUE}=================================================================${NC}"

# Check for root / sudo
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}[ERROR] This script must be run as root or with sudo!${NC}" 
   exit 1
fi

echo -e "\n${YELLOW}[1/6] Updating APT package repositories...${NC}"
apt-get update -y
apt-get upgrade -y
apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    ufw \
    htop \
    net-tools \
    unzip

echo -e "\n${YELLOW}[2/6] Installing Docker Engine & Plugins...${NC}"
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable docker
systemctl start docker

# Add non-root ubuntu user to docker group if present
if id "ubuntu" &>/dev/null; then
    usermod -aG docker ubuntu
    echo -e "${GREEN}✓ User 'ubuntu' added to docker group.${NC}"
fi

echo -e "\n${YELLOW}[3/6] Configuring UFW Firewall...${NC}"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP (Nginx)'
ufw allow 443/tcp comment 'HTTPS (Nginx SSL)'
ufw --force enable
ufw status verbose

echo -e "\n${YELLOW}[4/6] Tuning Linux Kernel Parameters for High-Concurrency...${NC}"
cat <<EOF > /etc/sysctl.d/99-pokevault.conf
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_tw_reuse = 1
fs.file-max = 2097152
EOF

sysctl -p /etc/sysctl.d/99-pokevault.conf

echo -e "\n${YELLOW}[5/6] Creating Application Directories & Permissions...${NC}"
mkdir -p /opt/pokevault /opt/backups /var/log/pokevault
chown -R ubuntu:ubuntu /opt/pokevault /opt/backups /var/log/pokevault 2>/dev/null || true

echo -e "\n${YELLOW}[6/6] Verifying Docker Installation...${NC}"
docker --version
docker compose version

echo -e "\n${GREEN}=================================================================${NC}"
echo -e "${GREEN}✅ EC2 PROVISIONING COMPLETE!${NC}"
echo -e "${GREEN}You can now clone the repo into /opt/pokevault and run deploy.sh${NC}"
echo -e "${GREEN}=================================================================${NC}"
