-- ============================================================================
-- SmartFinance — Schema MySQL
-- ============================================================================
-- Compatível com MySQL 5.7+/8.x e MariaDB (InfinityFree, Hostinger etc.).
-- Importe este arquivo no MySQL Workbench: File > Run SQL Script, ou
-- cole o conteúdo em "Query" e execute (Ctrl+Shift+Enter).
--
-- MODELO DE DADOS
-- ----------------------------------------------------------------------------
-- `users`            → pessoas que fazem login (e-mail + senha).
-- `accounts`         → o "espaço financeiro" (tenant) dono dos dados. Pode
--                       ser do tipo "personal" (1 dono) ou "company" (equipe).
-- `account_members`  → relação N:N entre users e accounts, com papel
--                       (owner/admin/member). Um usuário pode pertencer a
--                       várias accounts (ex: sua pessoal + a da empresa).
-- `account_invites`  → convites pendentes para entrar numa account de empresa.
-- Todas as tabelas de dados financeiros (transactions, bills, budgets,
-- credit_cards, goals, categories) são "escopadas" por account_id — é o que
-- garante que os dados de uma empresa fiquem isolados dos de outra.
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- Criação do banco (só necessário em ambiente local/XAMPP, onde você tem
-- permissão para criar bancos via SQL). Em hospedagem compartilhada
-- (InfinityFree, Hostinger etc.) geralmente NÃO é permitido criar o banco
-- assim — nesses casos, crie o banco pelo painel/cPanel primeiro e comente
-- ou apague as duas linhas abaixo antes de rodar o restante do script.
-- ----------------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS smartfinance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smartfinance;

-- ----------------------------------------------------------------------------
-- users
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- accounts (tenant: pessoal ou empresa)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS accounts (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  type ENUM('personal', 'company') NOT NULL DEFAULT 'personal',
  owner_user_id CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_accounts_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- account_members (equipe de uma account; para "personal" só tem 1 linha)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS account_members (
  account_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  role ENUM('owner', 'admin', 'member') NOT NULL DEFAULT 'member',
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (account_id, user_id),
  CONSTRAINT fk_members_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  CONSTRAINT fk_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- account_invites (convites para entrar numa empresa por e-mail)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS account_invites (
  id CHAR(36) NOT NULL PRIMARY KEY,
  account_id CHAR(36) NOT NULL,
  email VARCHAR(190) NOT NULL,
  role ENUM('admin', 'member') NOT NULL DEFAULT 'member',
  token CHAR(64) NOT NULL,
  invited_by CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  accepted_at DATETIME NULL,
  UNIQUE KEY uq_invites_token (token),
  KEY idx_invites_account (account_id),
  KEY idx_invites_email (email),
  CONSTRAINT fk_invites_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  CONSTRAINT fk_invites_inviter FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- auth_tokens (refresh tokens; permite revogar sessões / logout remoto)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_tokens (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  user_agent VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  UNIQUE KEY uq_tokens_hash (token_hash),
  KEY idx_tokens_user (user_id),
  CONSTRAINT fk_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- transactions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  account_id CHAR(36) NOT NULL,
  created_by CHAR(36) NULL,
  date DATE NOT NULL,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100) NULL,
  type ENUM('income', 'expense') NOT NULL,
  recurrence ENUM('none', 'monthly', 'yearly') NOT NULL DEFAULT 'none',
  recurrence_group_id CHAR(36) NULL,
  card_id CHAR(36) NULL,
  installment_group_id CHAR(36) NULL,
  installment_number SMALLINT UNSIGNED NULL,
  installment_total SMALLINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_tx_account_date (account_id, date),
  KEY idx_tx_recurrence_group (recurrence_group_id),
  KEY idx_tx_installment_group (installment_group_id),
  KEY idx_tx_card (card_id),
  CONSTRAINT fk_tx_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  CONSTRAINT fk_tx_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- bills (contas/compromissos financeiros com vencimento, juros e multa)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bills (
  id CHAR(36) NOT NULL PRIMARY KEY,
  account_id CHAR(36) NOT NULL,
  description VARCHAR(255) NOT NULL,
  due_date DATE NOT NULL,
  original_amount DECIMAL(14,2) NOT NULL,
  daily_interest_rate DECIMAL(8,5) NOT NULL DEFAULT 0,
  penalty_rate DECIMAL(8,5) NOT NULL DEFAULT 0,
  category VARCHAR(100) NOT NULL,
  type ENUM('income', 'expense') NOT NULL,
  is_paid TINYINT(1) NOT NULL DEFAULT 0,
  paid_date DATE NULL,
  paid_amount DECIMAL(14,2) NULL,
  is_recurring_monthly TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_bills_account_due (account_id, due_date),
  CONSTRAINT fk_bills_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- budgets (orçamento mensal por categoria; 1 linha por categoria/account)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS budgets (
  account_id CHAR(36) NOT NULL,
  category VARCHAR(100) NOT NULL,
  limit_amount DECIMAL(14,2) NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (account_id, category),
  CONSTRAINT fk_budgets_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- credit_cards
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS credit_cards (
  id CHAR(36) NOT NULL PRIMARY KEY,
  account_id CHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  credit_limit DECIMAL(14,2) NOT NULL,
  closing_day TINYINT UNSIGNED NOT NULL,
  due_day TINYINT UNSIGNED NOT NULL,
  color VARCHAR(20) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_cards_account (account_id),
  CONSTRAINT fk_cards_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Liga transactions.card_id → credit_cards.id (adicionada depois pra evitar
-- problema de ordem de criação das tabelas).
ALTER TABLE transactions
  ADD CONSTRAINT fk_tx_card FOREIGN KEY (card_id) REFERENCES credit_cards(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- goals (metas de poupança nomeadas)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS goals (
  id CHAR(36) NOT NULL PRIMARY KEY,
  account_id CHAR(36) NOT NULL,
  title VARCHAR(150) NOT NULL,
  icon VARCHAR(10) NULL,
  target_amount DECIMAL(14,2) NOT NULL,
  current_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  deadline DATE NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_goals_account (account_id),
  CONSTRAINT fk_goals_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- categories (categorias/subcategorias personalizadas criadas pelo usuário;
-- as categorias padrão do app continuam fixas no código do frontend)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id CHAR(36) NOT NULL PRIMARY KEY,
  account_id CHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  parent VARCHAR(100) NULL,
  icon VARCHAR(10) NULL,
  type ENUM('income', 'expense', 'both') NOT NULL DEFAULT 'expense',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_categories_account_name (account_id, name),
  CONSTRAINT fk_categories_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
