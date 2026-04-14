import * as fs from 'fs';
import * as path from 'path';
import { BankRule, BankRuleHit } from '@lc-copilot/shared';

interface BankRulesConfig {
  rules: BankRule[];
}

let cachedRules: BankRule[] | null = null;

function loadRules(): BankRule[] {
  if (cachedRules) return cachedRules;

  const configPath = path.join(__dirname, 'bankRules.config.json');
  const raw = fs.readFileSync(configPath, 'utf-8');
  const config: BankRulesConfig = JSON.parse(raw);
  cachedRules = config.rules;
  return cachedRules;
}

export function checkBankRules(clauseText: string): BankRuleHit[] {
  const rules = loadRules();
  const hits: BankRuleHit[] = [];
  const lowerText = clauseText.toLowerCase();

  for (const rule of rules) {
    for (const pattern of rule.patterns) {
      // Try as regex first, fall back to literal keyword match
      let matched = false;
      let matchedPattern = pattern;

      try {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(clauseText)) {
          matched = true;
        }
      } catch {
        // Pattern is not a valid regex, use literal match
        if (lowerText.includes(pattern.toLowerCase())) {
          matched = true;
        }
      }

      if (matched) {
        // Avoid duplicate rule hits (different patterns, same rule)
        if (!hits.find((h) => h.ruleId === rule.id)) {
          hits.push({
            ruleId: rule.id,
            ruleName: rule.name,
            description: rule.description,
            severity: rule.severity,
            matchedPattern: matchedPattern,
          });
        }
        break;
      }
    }
  }

  return hits;
}

export function formatRulesForPrompt(hits: BankRuleHit[]): string[] {
  return hits.map(
    (h) => `${h.ruleId} – ${h.ruleName}: ${h.description} (Severity: ${h.severity})`
  );
}

export function getAllRules(): BankRule[] {
  return loadRules();
}
