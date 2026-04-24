terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# -----------------------------
# KMS KEY FOR ENCRYPTION
# -----------------------------
resource "aws_kms_key" "secure_key" {
  description             = "KMS key for encryption"
  deletion_window_in_days = 10
}

# -----------------------------
# SECURE S3 BUCKET
# -----------------------------
resource "aws_s3_bucket" "secure_bucket" {
  bucket = "my-secure-private-bucket-demo-1234"
}

resource "aws_s3_bucket_versioning" "versioning" {
  bucket = aws_s3_bucket.secure_bucket.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "encryption" {
  bucket = aws_s3_bucket.secure_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.secure_key.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "secure_bucket" {
  bucket = aws_s3_bucket.secure_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# -----------------------------
# SECURITY GROUP (RESTRICTED)
# -----------------------------
resource "aws_security_group" "secure_sg" {
  name        = "secure-security-group"
  description = "Restricted access security group"

  ingress {
    description = "Allow SSH only from specific IP"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["YOUR_IP/32"]  # Replace with your IP
  }

  ingress {
    description = "Allow app access"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["YOUR_IP/32"]
  }

  egress {
    description = "Restricted outbound"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# -----------------------------
# SECURE EC2 INSTANCE
# -----------------------------
resource "aws_instance" "secure_ec2" {
  ami           = "ami-12345678"
  instance_type = "t3.micro"

  vpc_security_group_ids = [aws_security_group.secure_sg.id]

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"  # IMDSv2 enforced
  }

  root_block_device {
    encrypted  = true
    kms_key_id = aws_kms_key.secure_key.arn
  }
}

# -----------------------------
# ENCRYPTED EBS
# -----------------------------
resource "aws_ebs_volume" "secure_volume" {
  availability_zone = "us-east-1a"
  size              = 20
  encrypted         = true
  kms_key_id        = aws_kms_key.secure_key.arn
}

# -----------------------------
# SECURE RDS INSTANCE
# -----------------------------
resource "aws_db_instance" "secure_db" {
  identifier              = "secure-db-demo"
  engine                  = "mysql"
  instance_class          = "db.t3.micro"
  allocated_storage       = 20

  username                = "admin"
  password                = var.db_password

  storage_encrypted       = true
  kms_key_id              = aws_kms_key.secure_key.arn

  backup_retention_period = 7
  deletion_protection     = true

  iam_database_authentication_enabled = true

  skip_final_snapshot = false
}

# -----------------------------
# VARIABLES
# -----------------------------
variable "db_password" {
  description = "Database password"
  sensitive   = true
}
