resource "aws_kms_key" "secure_key" {
  description             = "KMS key for encryption"
  deletion_window_in_days = 10
  enable_key_rotation     = true
}

resource "aws_security_group" "secure_sg" {
  name        = "secure-security-group"
  description = "Restricted access security group"

  ingress {
    description = "Allow SSH only from specific IP"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["YOUR_IP/32"]
  }

  egress {
    description = "Restrict outbound traffic to VPC only"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["10.0.0.0/16"]  # Replace with your VPC CIDR
  }
}
