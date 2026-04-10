import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const vietnamTemplates = [
  { planNum: 201, code: '201', title: 'HANOI-HALONG-HANOI', days: 4, nights: 3, destination: 'Vietnam', brief: 'Classic Hanoi and Halong Bay experience' },
  { planNum: 202, code: '202', title: 'HANOI-HALONG-HANOI', days: 5, nights: 4, destination: 'Vietnam', brief: 'Extended Hanoi and Halong Bay with more exploration' },
  { planNum: 203, code: '203', title: 'HANOI-HALONG-HO CHI MINH', days: 6, nights: 5, destination: 'Vietnam', brief: 'North to South Vietnam journey' },
  { planNum: 204, code: '204', title: 'HANOI-HALONG-DANANG', days: 6, nights: 5, destination: 'Vietnam', brief: 'Northern highlights and Central Vietnam beaches' },
  { planNum: 205, code: '205', title: 'HANOI-SAPA-HALONG-HANOI', days: 7, nights: 6, destination: 'Vietnam', brief: 'Mountain retreat at Sapa and Halong Bay' },
  { planNum: 206, code: '206', title: 'HANOI-HALONG-DANANG-HO CHI MINH', days: 8, nights: 7, destination: 'Vietnam', brief: 'Complete Vietnam from North to South' },
  { planNum: 207, code: '207', title: 'HANOI-HALONG-HO CHI MINH-PHU QUOC', days: 9, nights: 8, destination: 'Vietnam', brief: 'Vietnam with Phu Quoc beach extension' },
  { planNum: 208, code: '208', title: 'DA NANG', days: 4, nights: 3, destination: 'Vietnam', brief: 'Central Vietnam beach getaway' },
  { planNum: 209, code: '209', title: 'HOI AN-DA NANG', days: 5, nights: 4, destination: 'Vietnam', brief: 'Heritage town Hoi An and Danang beaches' },
  { planNum: 210, code: '210', title: 'DANANG-HO CHI MINH', days: 6, nights: 5, destination: 'Vietnam', brief: 'Central Vietnam to South' },
  { planNum: 211, code: '211', title: 'DANANG-HANOI-HALONG BAY', days: 8, nights: 7, destination: 'Vietnam', brief: 'Central to North Vietnam highlights' },
  { planNum: 212, code: '212', title: 'DANANG-HANOI-HALONG-HO CHI MINH', days: 9, nights: 8, destination: 'Vietnam', brief: 'Full Vietnam discovery from Central' },
  { planNum: 213, code: '213', title: 'HO CHI MINH', days: 4, nights: 3, destination: 'Vietnam', brief: 'Southern Vietnam metropolis' },
  { planNum: 214, code: '214', title: 'HO CHI MINH', days: 5, nights: 4, destination: 'Vietnam', brief: 'Extended Southern Vietnam experience' },
  { planNum: 215, code: '215', title: 'HO CHI MINH-HANOI-HALONG', days: 7, nights: 6, destination: 'Vietnam', brief: 'South to North Vietnam highlights' },
  { planNum: 216, code: '216', title: 'HO CHI MINH-DANANG', days: 6, nights: 5, destination: 'Vietnam', brief: 'South to Central Vietnam' },
  { planNum: 217, code: '217', title: 'HO CHI MINH-DANANG-HANOI-HALONG', days: 8, nights: 7, destination: 'Vietnam', brief: 'Full Vietnam South to North' },
  { planNum: 218, code: '218', title: 'PHNOM PENH', days: 3, nights: 2, destination: 'Cambodia', brief: 'Cambodia capital city tour' },
  { planNum: 219, code: '219', title: 'SIEM REAP', days: 4, nights: 3, destination: 'Cambodia', brief: 'Angkor Wat temple discovery' },
  { planNum: 220, code: '220', title: 'PHNOM PENH-SIEM REAP', days: 5, nights: 4, destination: 'Cambodia', brief: 'Complete Cambodia experience' },
  { planNum: 221, code: '221', title: 'SIEM REAP-PHNOM PENH', days: 6, nights: 5, destination: 'Cambodia', brief: 'Extended Cambodia discovery' },
  { planNum: 222, code: '222', title: 'HANOI-HALONG-HO CHI MINH-SIEM REAP', days: 8, nights: 7, destination: 'Vietnam-Cambodia', brief: 'Vietnam and Cambodia combined' },
  { planNum: 223, code: '223', title: 'SIEM REAP-HANOI-HALONG-HO CHI MINH', days: 9, nights: 8, destination: 'Cambodia-Vietnam', brief: 'Cambodia to Vietnam adventure' },
  { planNum: 224, code: '224', title: 'HO CHI MINH-HANOI-HALONG-SIEM REAP', days: 10, nights: 9, destination: 'Vietnam-Cambodia', brief: 'South Vietnam to Cambodia' },
  { planNum: 225, code: '225', title: 'SIEM REAP-HO CHI MINH-DANANG-HANOI-HALONG', days: 12, nights: 11, destination: 'Cambodia-Vietnam', brief: 'Ultimate Indochina journey' },
  { planNum: 226, code: '226', title: 'HANOI-SAPA-HALONG-DANANG', days: 9, nights: 8, destination: 'Vietnam', brief: 'North Vietnam with Sapa mountains' },
  { planNum: 227, code: '227', title: 'PHU QUOC', days: 4, nights: 3, destination: 'Vietnam', brief: 'Phu Quoc Island beach holiday' },
  { planNum: 228, code: '228', title: 'PHU QUOC', days: 5, nights: 4, destination: 'Vietnam', brief: 'Extended Phu Quoc relaxing getaway' },
  { planNum: 229, code: '229', title: 'PHU QUOC-HO CHI MINH', days: 7, nights: 6, destination: 'Vietnam', brief: 'Beach and city combo' },
  { planNum: 230, code: '230', title: 'PHU QUOC-DANANG', days: 7, nights: 6, destination: 'Vietnam', brief: 'Dual beach destination' },
  { planNum: 231, code: '231', title: 'PHU QUOC-HANOI-NINH BINH-HALONG', days: 8, nights: 7, destination: 'Vietnam', brief: 'Island to Northern highlights' },
  { planNum: 232, code: '232', title: 'PHU QUOC-DA NANG-HANOI', days: 10, nights: 9, destination: 'Vietnam', brief: 'Comprehensive Vietnam beach and culture' },
  { planNum: 233, code: '233', title: 'PHU QUOC-DA NANG-HANOI', days: 11, nights: 10, destination: 'Vietnam', brief: 'Ultimate Vietnam beach and heritage tour' },
  { planNum: 234, code: '234', title: 'DANANG-PHU QUOC', days: 7, nights: 6, destination: 'Vietnam', brief: 'Central to Island Vietnam' },
  { planNum: 235, code: '235', title: 'HANOI-HALONG-DANANG-HOIAN-PHU QUOC', days: 9, nights: 8, destination: 'Vietnam', brief: 'Northern to Central to Island Vietnam' },
  { planNum: 236, code: '236', title: 'HANOI-NINH BINH-SAPA-HALONG-PHU QUOC', days: 10, nights: 9, destination: 'Vietnam', brief: 'North Vietnam mountains and island' },
  { planNum: 237, code: '237', title: 'HANOI-HALONG-DANANG-HOIAN-PHU QUOC', days: 10, nights: 9, destination: 'Vietnam', brief: 'Complete Central and North with Island' },
  { planNum: 238, code: '238', title: 'HANOI-HALONG-DANANG-HOIAN-HO CHI MINH-CU CHI-MEKONG-PHU QUOC', days: 12, nights: 11, destination: 'Vietnam', brief: 'Complete Vietnam discovery with Mekong' },
  { planNum: 239, code: '239', title: 'HANOI-NINH BINH-SAPA-HALONG-DANANG-HOIAN-HO CHI MINH', days: 12, nights: 11, destination: 'Vietnam', brief: 'Ultimate North to South Vietnam journey' },
];

async function seedVietnamTemplates() {
  console.log('Seeding Vietnam itinerary templates...');

  for (const template of vietnamTemplates) {
    await prisma.itineraryTemplate.upsert({
      where: { code: template.code },
      update: {},
      create: {
        planNum: template.planNum,
        code: template.code,
        title: template.title,
        days: template.days,
        nights: template.nights,
        destination: template.destination,
        brief: template.brief,
        itinerary: {},
        pricingUsd: {},
      },
    });
  }

  console.log(`Seeded ${vietnamTemplates.length} Vietnam itinerary templates`);
}

seedVietnamTemplates()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
