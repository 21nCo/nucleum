#!/bin/bash
set -e

# Start logging
# exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1
# echo "Starting user data script execution at $(date)"

# Function to log errors
log_error() {
    echo "ERROR: $1" >&2
}

# Configuring disk
DISK_NAME="/dev/xvdf"
MOUNT_POINT="/data"

echo "Configuring disk..."
lsblk
sudo file -s $DISK_NAME

# Check if the disk is already formatted
if ! blkid $DISK_NAME; then
    echo "Disk is not formatted. Formatting now..."
    sudo mkfs -t ext4 $DISK_NAME || log_error "Failed to format disk"
else
    echo "Disk is already formatted."
fi

# Mount the disk
echo "Mounting the disk..."
sudo mkdir -p $MOUNT_POINT
sudo mount $DISK_NAME $MOUNT_POINT || log_error "Failed to mount disk"

# Add to fstab for persistent mount
if ! grep -q $DISK_NAME /etc/fstab; then
    echo "Adding disk to fstab..."
    echo "$DISK_NAME $MOUNT_POINT ext4 defaults,nofail 0 2" | sudo tee -a /etc/fstab || log_error "Failed to add disk to fstab"
fi

# Install dependencies
echo "Updating system..."
sudo yum update -y || log_error "Failed to update system"
sudo dnf update -y || log_error "Failed to update system - dnf"

echo "Installing dependencies..."
sudo dnf install -y nginx nodejs npm || log_error "Failed to install Nginx and Node.js and npm"
# sudo yum install -y nodejs npm || log_error "Failed to install Node.js and npm"

# Verify Nginx installation
if ! which nginx > /dev/null; then
    log_error "Nginx installation failed"
    exit 1
fi

# Install and run Surreal
echo "Installing SurrealDB..."
curl -sSf https://install.surrealdb.com | sh || log_error "Failed to install SurrealDB"

# Install PM2
echo "Installing PM2..."
sudo npm install pm2 -g || log_error "Failed to install PM2"

# Start SurrealDB with PM2
echo "Starting SurrealDB with PM2..."
sudo pm2 start --name "db" "sudo surreal start --auth --user system --pass DB_PASS --bind 0.0.0.0:8080 file://data/surrealpvc" || log_error "Failed to start SurrealDB"
sudo pm2 startup || log_error "Failed to setup PM2 startup"
sudo pm2 save || log_error "Failed to save PM2 startup"

# Configure Nginx
echo "Configuring Nginx..."
sudo tee /etc/nginx/conf.d/reverse-proxy.conf > /dev/null <<EOL || log_error "Failed to create Nginx config"
server {
    listen 443 ssl;
    server_name DOMAIN_NAME;

    ssl_certificate /etc/pki/tls/certs/DOMAIN_NAME.pem;
    ssl_certificate_key /etc/pki/tls/private/DOMAIN_NAME.key;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}

server {
    listen 80;
    server_name DOMAIN_NAME;
    return 301 https://\$server_name\$request_uri;
}
EOL

# Download and install the ACM certificate
echo "Downloading and installing ACM certificate..."
aws acm get-certificate --certificate-arn CERTIFICATE_ARN --region CERTIFICATE_REGION > /tmp/cert.json || log_error "Failed to download certificate"
jq -r '.Certificate' < /tmp/cert.json | sudo tee /etc/pki/tls/certs/DOMAIN_NAME.pem > /dev/null || log_error "Failed to save certificate"
jq -r '.CertificateChain' < /tmp/cert.json | sudo tee -a /etc/pki/tls/certs/DOMAIN_NAME.pem > /dev/null || log_error "Failed to save certificate chain"
jq -r '.PrivateKey' < /tmp/cert.json | sudo tee /etc/pki/tls/private/DOMAIN_NAME.key > /dev/null || log_error "Failed to save private key"

# Secure the private key
sudo chmod 600 /etc/pki/tls/private/DOMAIN_NAME.key || log_error "Failed to set permissions on private key"

# Test Nginx configuration
echo "Testing Nginx configuration..."
sudo nginx -t || log_error "Nginx configuration test failed"

# Start Nginx
echo "Starting Nginx..."
sudo systemctl start nginx || log_error "Failed to start Nginx"

# Enable Nginx to start on boot
echo "Enabling Nginx to start on boot..."
sudo systemctl enable nginx || log_error "Failed to enable Nginx on boot"

echo "User data script execution completed at $(date)"