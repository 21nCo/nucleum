#!/bin/bash
set -e

# Configuring disk
DISK_NAME="/dev/xvdf"
MOUNT_POINT="/data"

lsblk
sudo file -s $DISK_NAME

# Check if the disk is already formatted
if ! blkid $DISK_NAME; then
    echo "Disk is not formatted. Formatting now..."
    sudo mkfs -t ext4 $DISK_NAME
else
    echo "Disk is already formatted."
fi

# Mount the disk
sudo mkdir -p $MOUNT_POINT
sudo mount $DISK_NAME $MOUNT_POINT

# Add to fstab for persistent mount
if ! grep -q $DISK_NAME /etc/fstab; then
    echo "$DISK_NAME $MOUNT_POINT ext4 defaults,nofail 0 2" | sudo tee -a /etc/fstab
fi

# Install dependencies
sudo yum update -y
sudo yum install -y nginx nodejs npm

# Install and run Surreal
curl -sSf https://install.surrealdb.com | sh
sudo mv /home/ec2-user/.surrealdb/surreal /usr/local/bin

# Install PM2
sudo npm install pm2 -g

# Start SurrealDB with PM2
sudo pm2 start --name "db" "sudo surreal start --log trace --auth --user system --pass DB_PASS --bind 0.0.0.0:8080 file://data/surrealpvc"
sudo pm2 startup

# Configure Nginx
sudo tee /etc/nginx/conf.d/reverse-proxy.conf > /dev/null <<EOL
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
aws acm get-certificate --certificate-arn CERTIFICATE_ARN --region us-east-1 > /tmp/cert.json
jq -r '.Certificate' < /tmp/cert.json | sudo tee /etc/pki/tls/certs/DOMAIN_NAME.pem > /dev/null
jq -r '.CertificateChain' < /tmp/cert.json | sudo tee -a /etc/pki/tls/certs/DOMAIN_NAME.pem > /dev/null
jq -r '.PrivateKey' < /tmp/cert.json | sudo tee /etc/pki/tls/private/DOMAIN_NAME.key > /dev/null

# Secure the private key
sudo chmod 600 /etc/pki/tls/private/DOMAIN_NAME.key

# Test Nginx configuration
sudo nginx -t

# Start Nginx
sudo systemctl start nginx

# Enable Nginx to start on boot
sudo systemctl enable nginx