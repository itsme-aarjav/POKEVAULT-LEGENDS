resource "aws_security_group" "rds" {
  name        = "${var.cluster_name}-rds-sg"
  description = "Security group for PokéVault RDS MySQL"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "MySQL access from VPC"
    from_port   = 3306
    to_port     = 3306
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  tags = {
    Name = "${var.cluster_name}-rds-sg"
  }
}

resource "aws_security_group" "redis" {
  name        = "${var.cluster_name}-redis-sg"
  description = "Security group for PokéVault ElastiCache Redis"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "Redis access from VPC"
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  tags = {
    Name = "${var.cluster_name}-redis-sg"
  }
}

resource "aws_db_subnet_group" "rds" {
  name        = "${var.cluster_name}-db-subnet-group"
  subnet_ids  = aws_subnet.private[*].id
  description = "Private DB subnet group for RDS"

  tags = {
    Name = "${var.cluster_name}-db-subnet-group"
  }
}

resource "aws_elasticache_subnet_group" "redis" {
  name        = "${var.cluster_name}-redis-subnet-group"
  subnet_ids  = aws_subnet.private[*].id
  description = "Private subnet group for Redis"

  tags = {
    Name = "${var.cluster_name}-redis-subnet-group"
  }
}

locals {
  config_secret = jsondecode(data.aws_secretsmanager_secret_version.config.secret_string)
}

resource "aws_db_instance" "mysql" {
  identifier             = "pokevault-mysql"
  engine                 = "mysql"
  engine_version         = "8.0"
  instance_class         = "db.t3.micro"
  allocated_storage      = 20
  storage_type           = "gp3"
  db_name                = "pokevault"
  username               = "pokevault"
  password               = local.config_secret["MYSQL_PASSWORD"]
  multi_az               = false
  publicly_accessible    = false
  skip_final_snapshot    = true
  deletion_protection    = false
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.rds.name

  tags = {
    Name = "pokevault-mysql"
  }
}

resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "pokevault-redis"
  engine               = "redis"
  engine_version       = "7.1"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.redis.name
  security_group_ids   = [aws_security_group.redis.id]
  apply_immediately    = true

  tags = {
    Name = "pokevault-redis"
  }
}

resource "aws_secretsmanager_secret_version" "runtime_config" {
  secret_id = data.aws_secretsmanager_secret.config.id
  secret_string = jsonencode(merge(
    local.config_secret,
    {
      MYSQL_HOST     = aws_db_instance.mysql.address
      MYSQL_PORT     = "3306"
      MYSQL_USER     = "pokevault"
      MYSQL_PASSWORD = local.config_secret["MYSQL_PASSWORD"]
      MYSQL_DATABASE = "pokevault"
      REDIS_HOST     = aws_elasticache_cluster.redis.cache_nodes[0].address
      REDIS_PORT     = "6379"
      REDIS_URL      = "redis://${aws_elasticache_cluster.redis.cache_nodes[0].address}:6379"
    }
  ))
}
