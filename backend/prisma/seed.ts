import { PrismaClient, Role, UserStatus, CampaignStatus, ApplicationStatus, SubmissionStatus, PaymentStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const PASSWORD = 'Password123!';
const hash = () => argon2.hash(PASSWORD);

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const NAMES = [
  ['Aarav Shrestha', 'FOOD', 'Kathmandu', ['Nepali', 'English']],
  ['Saanvi Gurung', 'TRAVEL', 'Pokhara', ['Nepali', 'Hindi']],
  ['Rijan Maharjan', 'TECH', 'Lalitpur', ['English', 'Nepali']],
  ['Priya Karki', 'FASHION', 'Kathmandu', ['Nepali', 'English']],
  ['Bikash Tamang', 'FITNESS', 'Bhaktapur', ['Nepali', 'English']],
  ['Anisha Rana', 'BEAUTY', 'Biratnagar', ['Nepali', 'Hindi']],
] as const;

const BRANDS = [
  { companyName: 'Himalayan Tea Co.', industry: 'Food & Beverage', person: 'Prakash Adhikari' },
  { companyName: 'Manakamana Foods', industry: 'Consumer Goods', person: 'Sunita Thapa' },
  { companyName: 'NepalTech Solutions', industry: 'Technology', person: 'Deepak Rajbhandari' },
] as const;

const CAMPAIGN_SEEDS: Array<{
  title: string;
  objective: string;
  product: string;
  status: CampaignStatus;
  budgetMin: number;
  budgetMax: number;
  platforms: string[];
  locations: string[];
  categories: string[];
}> = [
  { title: 'Himalayan Tea — Summer Chill Reels', objective: 'BRAND_AWARENESS', product: 'Iced Himalayan Tea', status: 'RECRUITING', budgetMin: 15000, budgetMax: 25000, platforms: ['INSTAGRAM', 'TIKTOK'], locations: ['Kathmandu', 'Pokhara'], categories: ['FOOD', 'LIFESTYLE'] },
  { title: 'Manakamana Momos — Launch Campaign', objective: 'PRODUCT_LAUNCH', product: 'Frozen Momos', status: 'RECRUITING', budgetMin: 20000, budgetMax: 40000, platforms: ['INSTAGRAM', 'FACEBOOK'], locations: ['Kathmandu', 'Lalitpur'], categories: ['FOOD'] },
  { title: 'NepalTech — App Review Sprint', objective: 'ENGAGEMENT', product: 'NepalTech Pay App', status: 'SHORTLISTING', budgetMin: 30000, budgetMax: 50000, platforms: ['YOUTUBE', 'INSTAGRAM'], locations: ['Kathmandu'], categories: ['TECH'] },
  { title: 'Himalayan Tea — Festival Stories', objective: 'SALES_CONVERSION', product: 'Festive Gift Pack', status: 'PRODUCTION', budgetMin: 10000, budgetMax: 18000, platforms: ['INSTAGRAM'], locations: ['Kathmandu', 'Bhaktapur'], categories: ['LIFESTYLE', 'FASHION'] },
  { title: 'NepalTech — Brand Documentary', objective: 'BRAND_AWARENESS', product: 'NepalTech Brand', status: 'REVIEW', budgetMin: 60000, budgetMax: 90000, platforms: ['YOUTUBE', 'INSTAGRAM'], locations: ['Kathmandu'], categories: ['TECH', 'BUSINESS'] },
  { title: 'Manakamana — Restaurant Vlog Series', objective: 'USER_GENERATED_CONTENT', product: 'Restaurant Experience', status: 'PUBLISHED', budgetMin: 12000, budgetMax: 20000, platforms: ['INSTAGRAM', 'TIKTOK', 'YOUTUBE'], locations: ['Pokhara'], categories: ['FOOD', 'TRAVEL'] },
];

async function main() {
  console.log('Seeding UGCNP...');

  await prisma.message.deleteMany();
  await prisma.conversationParticipant.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.verificationCode.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.application.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.campaignInvite.deleteMany();
  await prisma.portfolioItem.deleteMany();
  await prisma.dispute.deleteMany();
  await prisma.task.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.upload.deleteMany();
  await prisma.brandVerification.deleteMany();
  await prisma.creatorVerification.deleteMany();
  await prisma.platformLink.deleteMany();
  await prisma.creatorProfile.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.user.deleteMany();
  await prisma.platformSetting.deleteMany();

  await prisma.platformSetting.createMany({
    data: [
      { key: 'commissionPercent', value: 15 },
      { key: 'theme', value: { primaryColor: '#1B5E3B', accentColor: '#A3E635', logoUrl: '', brandName: 'UGCNP' } },
      { key: 'signupsOpen', value: true },
      { key: 'maintenanceMode', value: false },
    ],
    skipDuplicates: true,
  });

  const passwordHash = await hash();

  // internal ops users
  const admin = await prisma.user.create({ data: { name: 'Platform Admin', email: 'admin@ugcnp.local', passwordHash, role: 'ADMIN', status: 'ACTIVE', emailVerified: true } });
  const manager = await prisma.user.create({ data: { name: 'Ramesh Bista', email: 'manager@ugcnp.local', passwordHash, role: 'MANAGER', status: 'ACTIVE', emailVerified: true } });
  const qa = await prisma.user.create({ data: { name: 'Sita K.C.', email: 'qa@ugcnp.local', passwordHash, role: 'QA', status: 'ACTIVE', emailVerified: true } });
  const finance = await prisma.user.create({ data: { name: 'Nabin Pradhan', email: 'finance@ugcnp.local', passwordHash, role: 'FINANCE', status: 'ACTIVE', emailVerified: true } });

  console.log('  ops users:', [admin, manager, qa, finance].map((u) => u.email).join(', '));

  // creators
  const creatorProfiles: { profile: { id: string }; user: { id: string; email: string; name: string } }[] = [];
  for (const [name, category, city, langs] of NAMES) {
    const user = await prisma.user.create({
      data: {
        name,
        email: `${name.replace(/[^a-zA-Z]/g, '').toLowerCase()}@ugcnp.local`,
        passwordHash,
        role: 'CREATOR',
        status: 'ACTIVE',
        emailVerified: true,
        creatorProfile: {
          create: {
            bio: `${name} is a ${category.toLowerCase()} content creator based in ${city}, creating authentic ${pick(langs)} content.`,
            city,
            district: city,
            language: [...langs],
            category,
            instagram: `https://instagram.com/${name.toLowerCase().replace(' ', '_')}`,
            tiktok: `https://tiktok.com/@${name.toLowerCase().replace(' ', '_')}`,
            youtube: `https://youtube.com/@${name.toLowerCase().replace(' ', '_')}`,
            skills: [category, 'Video Editing', 'Reels', pick(['Storytelling', 'Photography', 'Copywriting'])],
            rateMin: 8000,
            rateMax: 30000,
            availableForWork: true,
            verificationStatus: 'VERIFIED',
            followersEstimate: 15000 + Math.floor(Math.random() * 180000),
            engagementRate: Math.round((3 + Math.random() * 6) * 10) / 10,
            portfolio: {
              create: [
                { title: `${category} showcase`, url: `https://picsum.photos/seed/${name.replace(/\s/g, '')}-1/720/900`, kind: 'IMAGE', caption: 'Sample portfolio piece' },
                { title: 'Client: recent UGC', url: `https://picsum.photos/seed/${name.replace(/\s/g, '')}-2/720/900`, kind: 'IMAGE', caption: 'UGC highlight' },
              ],
            },
            platforms: {
              create: [
                { platform: 'INSTAGRAM', handle: name.toLowerCase().replace(' ', '_'), url: `https://instagram.com/${name.toLowerCase().replace(' ', '_')}`, followers: 20000 + Math.floor(Math.random() * 150000), verified: true },
                { platform: 'TIKTOK', handle: name.toLowerCase().replace(' ', '_'), url: `https://tiktok.com/@${name.toLowerCase().replace(' ', '_')}`, followers: 8000 + Math.floor(Math.random() * 80000) },
              ],
            },
          },
        },
      },
      include: { creatorProfile: { select: { id: true } } },
    });
    creatorProfiles.push({ profile: { id: user.creatorProfile!.id }, user: { id: user.id, email: user.email, name } });
    console.log('  creator:', user.email);
  }

  // brands + campaigns
  const brandRefs: { brand: { id: string }; user: { id: string; email: string } }[] = [];
  for (const b of BRANDS) {
    const user = await prisma.user.create({
      data: {
        name: b.person,
        email: b.companyName.replace(/[^a-zA-Z]/g, '').toLowerCase() + '@ugcnp.local',
        passwordHash,
        role: 'BRAND',
        status: 'ACTIVE',
        emailVerified: true,
        brand: {
          create: {
            companyName: b.companyName,
            industry: b.industry,
            contactPerson: b.person,
            description: `${b.companyName} creates ${b.industry} products loved across Nepal.`,
            address: 'Kathmandu, Nepal',
            website: 'https://example.com.np',
            verificationStatus: 'VERIFIED',
          },
        },
      },
      include: { brand: { select: { id: true } } },
    });
    brandRefs.push({ brand: { id: user.brand!.id }, user: { id: user.id, email: user.email } });
    console.log('  brand:', user.email);
  }

  const campaignsMap: { id: string; title: string; brandId: string }[] = [];
  for (const seed of CAMPAIGN_SEEDS) {
    const brand = pick(brandRefs).brand;
    const slug = seed.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60) + '-' + Math.random().toString(36).slice(2, 7);
    const campaign = await prisma.campaign.create({
      data: {
        brandId: brand.id,
        title: seed.title,
        slug,
        description: `${seed.title}. We are looking for authentic creators in ${seed.locations.join(', ')} to produce ${seed.platforms.join(' + ')} content for our ${seed.product} initiative.`,
        objective: seed.objective as never,
        product: seed.product,
        targetAudience: { ageRange: [18, 35], gender: 'ALL', interests: seed.categories, locations: seed.locations },
        targetLocations: seed.locations,
        platforms: seed.platforms as never,
        creatorRequirements: { categories: seed.categories, minFollowers: 5000, languages: ['Nepali', 'English'], locations: seed.locations },
        deliverables: [{ type: 'REEL', quantity: 2, spec: 'Vertical 9:16, 15-45s' }],
        deadline: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        budgetMin: seed.budgetMin,
        budgetMax: seed.budgetMax,
        currency: 'NPR',
        perCreator: true,
        usageRights: 'NON_EXCLUSIVE',
        status: seed.status,
        createdById: brandRefs.find((b) => b.brand.id === brand.id)!.user.id,
        publishedAt: seed.status !== 'DRAFT' ? new Date(Date.now() - 5 * 24 * 3600 * 1000) : null,
      },
    });
    campaignsMap.push({ id: campaign.id, title: seed.title, brandId: brand.id });
    console.log('  campaign:', seed.title, `[${seed.status}]`);
  }

  // applications & submissions depending on status
  const recruiting = campaignsMap.slice(0, 2);
  const shortlisting = campaignsMap[2];
  const production = campaignsMap[3];
  const review = campaignsMap[4];
  const published = campaignsMap[5];

  const appStatusFor = (campaignId: string, index: number): ApplicationStatus => {
    if (campaignId === recruiting[0]?.id || campaignId === recruiting[1]?.id || campaignId === shortlisting.id) return index === 0 ? 'PENDING' : 'SHORTLISTED';
    if (campaignId === production.id || campaignId === review.id) return 'ACCEPTED';
    if (campaignId === published.id) return 'ACCEPTED';
    return 'PENDING';
  };

  const submissionsDone = (campaignId: string): boolean =>
    campaignId === production.id || campaignId === review.id || campaignId === published.id;

  const usedPairs = new Set<string>();
  let appIdx = 0;
  for (const campaign of campaignsMap) {
    const applicantCount = campaign.id === published.id ? 2 : campaign.id === review.id ? 1 : 2;
    let made = 0;
    for (const cp of creatorProfiles) {
      if (made >= applicantCount) break;
      if (usedPairs.has(`${campaign.id}:${cp.profile.id}`)) continue;
      if (campaign.id === recruiting[0]?.id && made >= 1 && Math.random() > 0.5) continue;
      usedPairs.add(`${campaign.id}:${cp.profile.id}`);
      made += 1;
      const status = appStatusFor(campaign.id, appIdx % 2);
      appIdx += 1;
      const application = await prisma.application.create({
        data: {
          campaignId: campaign.id,
          creatorId: cp.profile.id,
          pitch: `I'm passionate about ${campaign.title}. I can deliver authentic, high-quality UGC that resonates with Nepali audiences in ${campaignsMap.find((c) => c.id === campaign.id)?.title ?? 'this'} space.`,
          proposedRate: 12000 + (appIdx % 3) * 2000,
          status,
          reviewedAt: status === 'ACCEPTED' || status === 'SHORTLISTED' ? new Date() : null,
        },
      });

      if (submissionsDone(campaign.id) && status === 'ACCEPTED') {
        const version = appIdx === 1 ? 2 : 1;
        const subStatus: SubmissionStatus = campaign.id === review.id ? 'IN_REVISION' : campaign.id === published.id ? 'APPROVED' : 'SUBMITTED';
        await prisma.submission.create({
          data: {
            applicationId: application.id,
            creatorId: cp.user.id,
            campaignId: campaign.id,
            version,
            fileUrl: `https://example.com/media/${campaign.id}/${cp.user.id}/v${version}.mp4`,
            caption: pick(['Check out this new find! #NepalCreates', 'In partnership with a brand we love.', 'Weekend vibes, made for you.']),
            status: subStatus,
            feedback: subStatus === 'IN_REVISION' ? 'Great start! Please mention the product within the first 3 seconds and add a clearer CTA.' : subStatus === 'APPROVED' ? 'Amazing work — approved!' : null,
          },
        });
      }
      console.log(`  application: ${cp.user.email} -> ${campaign.title} [${status}]`);
    }
  }

  // payments + invoices for approved submissions on published campaign
  const approvedSubs = await prisma.submission.findMany({ where: { status: 'APPROVED' }, include: { application: true } });
  for (const sub of approvedSubs.slice(0, 2)) {
    const amount = sub.application.proposedRate ?? 15000;
    const commissionPercent = 15;
    const commissionAmount = Math.round((amount * commissionPercent) / 100);
    const createdAt = new Date(Date.now() - 2 * 24 * 3600 * 1000);
    await prisma.payment.create({
      data: {
        campaignId: sub.campaignId,
        applicationId: sub.applicationId,
        creatorId: sub.creatorId,
        amount,
        commissionPercent,
        commissionAmount,
        payoutAmount: amount - commissionAmount,
        status: 'PAID',
        paidAt: new Date(Date.now() - 1 * 24 * 3600 * 1000),
        createdAt,
      },
    });
  }

  const transactions = await prisma.payment.findMany({ include: { campaign: { include: { brand: true } } }, where: { status: 'PAID' } });
  const seen = new Set<string>();
  for (const t of transactions) {
    if (seen.has(t.campaign.brandId)) continue;
    seen.add(t.campaign.brandId);
    await prisma.invoice.create({
      data: {
        brandId: t.campaign.brandId,
        campaignId: t.campaignId,
        amount: t.amount,
        commissionPercent: t.commissionPercent,
        commissionAmount: t.commissionAmount,
        status: 'PAID',
        dueDate: new Date(Date.now() - 1 * 24 * 3600 * 1000),
      },
    });
  }
  console.log(`  payments: ${transactions.length}, invoices: ${seen.size}`);

  // a couple of ops tasks
  await prisma.task.createMany({
    data: [
      { title: 'Verify creator documents — batch 3', description: 'Pending document review for 5 creators', assigneeId: qa.id, status: 'IN_PROGRESS', priority: 'HIGH', createdById: manager.id },
      { title: 'Reconcile September payouts', description: 'Match eSewa/bank records against ledger', assigneeId: finance.id, status: 'TODO', priority: 'URGENT', createdById: manager.id },
    ],
  });

  const total = {
    users: Object.keys(await prisma.user.groupBy({ by: ['role'], _count: { _all: true } })).length,
    campaigns: campaignsMap.length,
    applications: await prisma.application.count(),
    submissions: await prisma.submission.count(),
  };
  console.log('\nSeed complete:', JSON.stringify(total));
  console.log('\nLogin credentials (all users): password =', PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());