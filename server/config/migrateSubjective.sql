-- Subjective AI Answer Sheet Evaluation tables

CREATE TABLE IF NOT EXISTS master_answer_keys (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  pdf_path VARCHAR(255) NOT NULL,
  total_questions INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS master_qa (
  id INT AUTO_INCREMENT PRIMARY KEY,
  master_key_id INT NOT NULL,
  question_no INT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  keywords TEXT,
  UNIQUE KEY uniq_master_question (master_key_id, question_no),
  CONSTRAINT fk_master_qa_key FOREIGN KEY (master_key_id) REFERENCES master_answer_keys(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS subjective_evaluations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  master_key_id INT NOT NULL,
  student_name VARCHAR(120),
  student_pdf_path VARCHAR(255) NOT NULL,
  marked_pdf_path VARCHAR(255),
  total_questions INT NOT NULL DEFAULT 0,
  correct_count INT NOT NULL DEFAULT 0,
  wrong_count INT NOT NULL DEFAULT 0,
  percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  status ENUM('pass','fail') NOT NULL DEFAULT 'fail',
  details_json LONGTEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_subjective_master FOREIGN KEY (master_key_id) REFERENCES master_answer_keys(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
