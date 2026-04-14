import { PrismaClient, UserRole, LCType, ClauseType, RiskLevel } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { seedUCP600Knowledge } from '../rag/ucp600.seed';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ─── Seed UCP 600 Knowledge Base ──────────────────────────────────────────
  try {
    await seedUCP600Knowledge();
  } catch (error) {
    console.warn('⚠ UCP600 knowledge seeding failed (pgvector may not be available):', error);
  }

  // ─── Seed Users ───────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('password123', 12);

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'trade.rm@bank.com' },
      update: {},
      create: {
        email: 'trade.rm@bank.com',
        name: 'Alex Johnson',
        role: UserRole.TRADE_RM,
        passwordHash,
      },
    }),
    prisma.user.upsert({
      where: { email: 'compliance@bank.com' },
      update: {},
      create: {
        email: 'compliance@bank.com',
        name: 'Sarah Chen',
        role: UserRole.COMPLIANCE_OFFICER,
        passwordHash,
      },
    }),
    prisma.user.upsert({
      where: { email: 'admin@bank.com' },
      update: {},
      create: {
        email: 'admin@bank.com',
        name: 'James Walker',
        role: UserRole.ADMIN,
        passwordHash,
      },
    }),
  ]);

  console.log(`✓ Created ${users.length} users`);

  // ─── Seed Demo LC Session ─────────────────────────────────────────────────
  const tradeRM = users[0];

  const existingSession = await prisma.lCSession.findUnique({
    where: { referenceNumber: 'LC-DEMO-001' },
  });

  if (existingSession) {
    console.log('✓ Demo session already exists, skipping clause creation');
    console.log('\n✅ Seed complete!\n');
    return;
  }

  const session = await prisma.lCSession.create({
    data: {
      referenceNumber: 'LC-DEMO-001',
      applicantName: 'Apex Trading Co.',
      lcType: LCType.SIGHT,
      status: 'IN_REVIEW',
      rawText: `IRREVOCABLE DOCUMENTARY CREDIT NO: LC-DEMO-001

APPLICANT: Apex Trading Co., 123 Commerce Street, Singapore 048545

BENEFICIARY: Global Exports Ltd., 456 Trade Avenue, Hamburg, Germany

CREDIT AMOUNT: USD 500,000.00 (Five Hundred Thousand US Dollars)

AVAILABILITY: Available by sight payment with Nominated Bank

EXPIRY DATE: 15 October 2026 at beneficiary's counters

SHIPMENT: From Hamburg, Germany to Singapore not later than 30 September 2026

DOCUMENTS REQUIRED:
1. Commercial Invoice in triplicate
2. Full set of Clean On Board Bills of Lading made out to order of issuing bank, notify applicant
3. Packing List in duplicate
4. Certificate of Origin issued by Chamber of Commerce
5. Inspection Certificate acceptable to applicant

PAYMENT TERMS: Payment within 5 days of document presentation

SPECIAL CONDITIONS: This credit is automatically extended for one year unless notified otherwise

GOVERNING LAW: This credit is subject to UCP 600 (2007 Revision), ICC Publication No. 600`,
      officerId: tradeRM.id,
    },
  });

  console.log(`✓ Created demo session: ${session.referenceNumber}`);

  // ─── Seed 8 Demo Clauses ──────────────────────────────────────────────────
  const clauseData = [
    {
      clauseIndex: 1,
      clauseType: ClauseType.CREDIT_AMOUNT,
      originalText: 'USD 500,000.00 (Five Hundred Thousand US Dollars only). No tolerance on credit amount.',
      riskLevel: RiskLevel.COMPLIANT,
      isSoftClause: false,
      confidenceScore: 0.97,
      riskFindings: [],
      ucpArticles: ['Article 30 – Tolerance in Credit Amount'],
      bankRulesHit: [],
    },
    {
      clauseIndex: 2,
      clauseType: ClauseType.AVAILABILITY_TERMS,
      originalText: 'Available by sight payment with Nominated Bank. Partial drawings approximately 10% permitted.',
      riskLevel: RiskLevel.LOW,
      isSoftClause: false,
      confidenceScore: 0.85,
      riskFindings: [
        {
          issue: 'Tolerance word "approximately" may require clarification',
          severity: 'LOW',
          explanation: 'The word "approximately" when used in relation to drawings triggers Article 30 tolerance provisions. While 10% is within permissible limits, explicit wording is clearer.',
        },
      ],
      ucpArticles: ['Article 30 – Tolerance in Credit Amount, Quantity and Unit Prices'],
      bankRulesHit: ['RULE_006'],
    },
    {
      clauseIndex: 3,
      clauseType: ClauseType.DOCUMENT_REQUIREMENTS,
      originalText: 'Inspection Certificate acceptable to applicant confirming goods are in satisfactory condition and meet buyer\'s approval prior to shipment.',
      riskLevel: RiskLevel.HIGH,
      isSoftClause: true,
      confidenceScore: 0.98,
      riskFindings: [
        {
          issue: 'SOFT CLAUSE DETECTED: Payment conditional on applicant approval',
          severity: 'HIGH',
          explanation: 'This clause makes payment conditional on "acceptable to applicant" and "buyer\'s approval" — granting the applicant unilateral power to block payment by refusing to issue or accept the inspection certificate. This directly violates UCP 600 Articles 4 and 5.',
        },
        {
          issue: 'Vague qualifier: "satisfactory condition"',
          severity: 'HIGH',
          explanation: '"Satisfactory condition" is a subjective standard that cannot be objectively verified by a bank on the face of documents. Banks examine documents, not goods.',
        },
      ],
      ucpArticles: [
        'Article 4 – Credits vs. Contracts',
        'Article 5 – Documents vs. Goods, Services or Performance',
        'Article 14 – Standard for Examination of Documents',
      ],
      bankRulesHit: ['RULE_001', 'RULE_003'],
    },
    {
      clauseIndex: 4,
      clauseType: ClauseType.PAYMENT_TERMS,
      originalText: 'Payment within 5 days of document presentation at issuing bank counters.',
      riskLevel: RiskLevel.HIGH,
      isSoftClause: false,
      confidenceScore: 0.95,
      riskFindings: [
        {
          issue: 'Presentation period below UCP 600 minimum',
          severity: 'HIGH',
          explanation: 'UCP 600 Article 14(c) requires presentation of transport documents within 21 calendar days after shipment date. Requiring payment within 5 days of presentation at issuing bank does not allow adequate time for document examination (banks have 5 banking days under Article 14(b)) plus courier transit time.',
        },
      ],
      ucpArticles: [
        'Article 14 – Standard for Examination of Documents',
        'Article 15 – Complying Presentation',
        'Article 16 – Discrepant Documents, Waiver and Notice',
      ],
      bankRulesHit: ['RULE_002'],
    },
    {
      clauseIndex: 5,
      clauseType: ClauseType.SHIPMENT_TERMS,
      originalText: 'Shipment from Hamburg, Germany to Singapore. Partial shipments not permitted. Transhipment allowed via any port. Latest shipment date 30 September 2026.',
      riskLevel: RiskLevel.MEDIUM,
      isSoftClause: false,
      confidenceScore: 0.88,
      riskFindings: [
        {
          issue: 'Transhipment allowance inconsistency',
          severity: 'MEDIUM',
          explanation: 'While partial shipments are prohibited, transhipment is allowed. The combination may create operational difficulties for the beneficiary if goods cannot be consolidated at Hamburg for direct shipment. Transhipment BL requirements under Article 20 should be clearly specified.',
        },
      ],
      ucpArticles: [
        'Article 19 – Transport Document covering at least Two Modes',
        'Article 20 – Bill of Lading',
        'Article 31 – Partial Drawings or Shipments',
      ],
      bankRulesHit: [],
    },
    {
      clauseIndex: 6,
      clauseType: ClauseType.EXPIRY_DATE,
      originalText: 'This credit expires on 15 October 2026 at the counters of the issuing bank in Singapore.',
      riskLevel: RiskLevel.COMPLIANT,
      isSoftClause: false,
      confidenceScore: 0.99,
      riskFindings: [],
      ucpArticles: ['Article 29 – Extension of Expiry Date or Last Day for Presentation'],
      bankRulesHit: [],
    },
    {
      clauseIndex: 7,
      clauseType: ClauseType.SPECIAL_CONDITIONS,
      originalText: 'This credit is automatically extended for one year unless the issuing bank provides written notice of non-renewal at least 30 days before expiry.',
      riskLevel: RiskLevel.HIGH,
      isSoftClause: false,
      confidenceScore: 0.96,
      riskFindings: [
        {
          issue: 'EVERGREEN CLAUSE DETECTED: Automatic extension without limit',
          severity: 'HIGH',
          explanation: 'This clause creates an evergreen standby LC structure with automatic renewal — prohibited under bank policy RULE_004. Such clauses create open-ended contingent liabilities on the bank\'s balance sheet without requiring credit committee re-approval. The clause also conflicts with UCP 600\'s concept of a credit having a definite expiry.',
        },
      ],
      ucpArticles: ['Article 29 – Extension of Expiry Date or Last Day for Presentation'],
      bankRulesHit: ['RULE_004'],
    },
    {
      clauseIndex: 8,
      clauseType: ClauseType.GOVERNING_LAW,
      originalText: 'This documentary credit is subject to the Uniform Customs and Practice for Documentary Credits, 2007 Revision, ICC Publication No. 600 (UCP 600).',
      riskLevel: RiskLevel.COMPLIANT,
      isSoftClause: false,
      confidenceScore: 0.99,
      riskFindings: [],
      ucpArticles: ['Article 1 – Application of UCP'],
      bankRulesHit: [],
    },
  ];

  for (const cd of clauseData) {
    await prisma.clause.create({
      data: {
        clauseIndex: cd.clauseIndex,
        clauseType: cd.clauseType,
        originalText: cd.originalText,
        riskLevel: cd.riskLevel,
        isSoftClause: cd.isSoftClause,
        confidenceScore: cd.confidenceScore,
        riskFindings: cd.riskFindings as object[],
        ucpArticles: cd.ucpArticles,
        bankRulesHit: cd.bankRulesHit,
        sessionId: session.id,
        alternatives: cd.riskLevel !== RiskLevel.COMPLIANT
          ? {
              create: getAlternativesForClause(cd.clauseIndex),
            }
          : undefined,
      },
    });
  }

  console.log(`✓ Created 8 demo clauses with alternatives`);
  console.log('\n✅ Seed complete!');
  console.log('\nDemo credentials:');
  console.log('  Trade RM:   trade.rm@bank.com / password123');
  console.log('  Compliance: compliance@bank.com / password123');
  console.log('  Admin:      admin@bank.com / password123\n');
}

function getAlternativesForClause(clauseIndex: number) {
  const alternatives: Array<{ wording: string; rationale: string; ucpBasis: string }> = [];

  switch (clauseIndex) {
    case 2:
      alternatives.push({
        wording: 'Available by sight payment with Nominated Bank. Partial drawings permitted up to 10% (ten percent) of the credit amount.',
        rationale: 'Removes the word "approximately" which triggers UCP 600 Article 30 tolerance provisions, replacing it with an explicit percentage. This provides certainty for both the bank and beneficiary while maintaining commercial intent.',
        ucpBasis: 'UCP 600 Article 30 – Tolerance in Credit Amount, Quantity and Unit Prices',
      });
      break;
    case 3:
      alternatives.push({
        wording: 'Independent Inspection Certificate issued by SGS, Bureau Veritas, or Intertek, certifying that goods conform to the contract specifications as evidenced by the commercial invoice, issued not more than 3 days prior to the bill of lading date.',
        rationale: 'Removes the soft clause elements ("acceptable to applicant", "buyer\'s approval") entirely and replaces them with an independent third-party inspection requirement. This complies with UCP 600 Articles 4 and 5 by ensuring document compliance can be determined on the face of the certificate without reference to the applicant.',
        ucpBasis: 'UCP 600 Article 4 – Credits vs. Contracts; Article 5 – Documents vs. Goods',
      });
      alternatives.push({
        wording: 'Pre-shipment Inspection Certificate issued by an internationally recognised inspection company (SGS, Bureau Veritas, Intertek, or CCIC) certifying conformity of goods with purchase order specifications. Certificate must be signed and stamped by the inspection company.',
        rationale: 'Alternative formulation specifying inspection by a named list of internationally recognised companies, removing any applicant discretion. The requirement for signature and stamp ensures the certificate is independently verifiable.',
        ucpBasis: 'UCP 600 Article 14 – Standard for Examination of Documents',
      });
      break;
    case 4:
      alternatives.push({
        wording: 'Documents must be presented to the issuing bank within 21 calendar days after the date of shipment as evidenced by the bill of lading date, but in any event not later than the expiry date of this credit.',
        rationale: 'Replaces the 5-day payment term with the UCP 600 Article 14(c) minimum 21-day presentation period. This gives the beneficiary adequate time to prepare and courier documents while complying with UCP requirements.',
        ucpBasis: 'UCP 600 Article 14 – Standard for Examination of Documents (sub-article c)',
      });
      break;
    case 5:
      alternatives.push({
        wording: 'Shipment from Hamburg, Germany to Singapore. Partial shipments not permitted. Transhipment permitted provided all transhipment is covered by the same bill of lading evidencing the entire carriage from port of loading to port of discharge. Latest shipment date: 30 September 2026.',
        rationale: 'Clarifies transhipment requirements in line with UCP 600 Article 20(b), ensuring the bill of lading covers the entire voyage. This prevents disputes over whether transhipment bills constitute partial shipments.',
        ucpBasis: 'UCP 600 Article 20 – Bill of Lading',
      });
      break;
    case 7:
      alternatives.push({
        wording: 'This credit expires on the date stated in the expiry field. No automatic extension applies. Any amendment to extend the expiry date must be issued by the issuing bank in writing.',
        rationale: 'Removes the evergreen/automatic extension clause entirely, replacing it with an explicit statement that no automatic extension applies. Any extension requires formal amendment, which triggers credit approval processes per bank policy.',
        ucpBasis: 'UCP 600 Article 29 – Extension of Expiry Date or Last Day for Presentation',
      });
      break;
    default:
      break;
  }

  return alternatives;
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
