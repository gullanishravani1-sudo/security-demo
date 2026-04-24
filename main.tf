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

resource "aws_s3_bucket" "public_bucket" {
  bucket = "my-insecure-public-bucket-demo-1234"
}

resource "aws_s3_bucket_public_access_block" "public_bucket" {
  bucket = aws_s3_bucket.public_bucket.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_acl" "public_bucket_acl" {
  bucket = aws_s3_bucket.public_bucket.id
  acl    = "public-read"
}

resource "aws_security_group" "open_sg" {
  name        = "open-security-group"
  description = "Insecure security group"

  ingress {
    description = "Allow SSH from anywhere"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Allow app port from anywhere"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "insecure_ec2" {
  ami           = "ami-12345678"
  instance_type = "t3.micro"

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "optional"
  }
}

resource "aws_ebs_volume" "unencrypted_volume" {
  availability_zone = "us-east-1a"
  size              = 20
  encrypted         = false
}

resource "aws_db_instance" "insecure_db" {
  identifier          = "insecure-db-demo"
  engine              = "mysql"
  instance_class      = "db.t3.micro"
  allocated_storage   = 20
  username            = "admin"
  password            = "Password123!"
  skip_final_snapshot = true
  storage_encrypted   = false
}

variable "db_password" {
  default = "SuperSecretPassword123!"
}
