/**
 * Unique Properties — database seed (idempotent).
 *
 *   npm run db:seed      (or: npx prisma db seed)
 *
 * Uses upserts keyed on unique columns so it can be run repeatedly without
 * creating duplicates. Data reflects the real site: Park View Lahore, PKR,
 * Marla/Kanal area units.
 */
import { PrismaClient, ListingPurpose, AreaUnit, Currency, BlogStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Small slug helper.
const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

async function main() {
  console.log('🌱  Seeding Unique Properties…');

  // ---------------------------------------------------------------- RBAC
  const permissionDefs = [
    ['property.view', 'View properties', 'property'],
    ['property.create', 'Create properties', 'property'],
    ['property.update', 'Edit properties', 'property'],
    ['property.delete', 'Delete properties', 'property'],
    ['blog.manage', 'Manage blog', 'blog'],
    ['user.manage', 'Manage users', 'user'],
    ['media.upload', 'Upload media', 'media'],
    ['settings.manage', 'Manage settings', 'settings'],
    ['seo.manage', 'Manage SEO', 'seo'],
    ['analytics.view', 'View analytics', 'analytics'],
  ] as const;

  const permissions = await Promise.all(
    permissionDefs.map(([slug, name, group]) =>
      prisma.permission.upsert({
        where: { slug },
        update: { name, group },
        create: { slug, name, group },
      }),
    ),
  );

  const superAdminRole = await prisma.role.upsert({
    where: { slug: 'super-admin' },
    update: {},
    create: { name: 'Super Admin', slug: 'super-admin', description: 'Full access', isSystem: true },
  });
  const editorRole = await prisma.role.upsert({
    where: { slug: 'editor' },
    update: {},
    create: { name: 'Editor', slug: 'editor', description: 'Content + properties' },
  });

  // Grant every permission to Super Admin.
  for (const p of permissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: superAdminRole.id, permissionId: p.id } },
      update: {},
      create: { roleId: superAdminRole.id, permissionId: p.id },
    });
  }

  // ---------------------------------------------------------------- Admin
  // NOTE: replace this bcrypt/argon2 hash with a real one in production.
  const admin = await prisma.admin.upsert({
    where: { email: 'admin@uniqueproperties.pk' },
    update: {},
    create: {
      email: 'admin@uniqueproperties.pk',
      name: 'Site Admin',
      passwordHash: '$argon2id$REPLACE_WITH_REAL_HASH',
      roleId: superAdminRole.id,
    },
  });

  // ---------------------------------------------------------------- Lookups
  const typeDefs = ['Villa', 'House', 'Apartment', 'Plot', 'Commercial'];
  const types = Object.fromEntries(
    await Promise.all(
      typeDefs.map(async (name, i) => [
        name,
        await prisma.propertyType.upsert({
          where: { slug: slugify(name) },
          update: {},
          create: { name, slug: slugify(name), sortOrder: i },
        }),
      ]),
    ),
  );

  const residential = await prisma.propertyCategory.upsert({
    where: { slug: 'residential' },
    update: {},
    create: { name: 'Residential', slug: 'residential' },
  });
  const commercial = await prisma.propertyCategory.upsert({
    where: { slug: 'commercial' },
    update: {},
    create: { name: 'Commercial', slug: 'commercial' },
  });

  const statusDefs = [
    ['Available', '#10B981'],
    ['Under Offer', '#F59E0B'],
    ['Sold', '#EF4444'],
    ['Rented', '#6B7280'],
  ];
  const statuses = Object.fromEntries(
    await Promise.all(
      statusDefs.map(async ([name, color], i) => [
        name,
        await prisma.propertyStatus.upsert({
          where: { slug: slugify(name) },
          update: { color },
          create: { name, slug: slugify(name), color, sortOrder: i },
        }),
      ]),
    ),
  );

  const amenityDefs = ['Swimming Pool', 'Gym', 'Security', 'Parking', 'Backup Power', 'Garden'];
  const amenities = await Promise.all(
    amenityDefs.map((name) =>
      prisma.amenity.upsert({
        where: { slug: slugify(name) },
        update: {},
        create: { name, slug: slugify(name) },
      }),
    ),
  );

  // ---------------------------------------------------------------- Agent
  const agent = await prisma.agent.upsert({
    where: { slug: 'ahmed-khan' },
    update: {},
    create: {
      firstName: 'Ahmed',
      lastName: 'Khan',
      slug: 'ahmed-khan',
      email: 'ahmed@uniqueproperties.pk',
      phone: '+92 300 8499644',
      whatsapp: '923008499644',
      designation: 'Senior Property Consultant',
      isVerified: true,
      profile: {
        create: {
          bio: 'Park View Lahore specialist with 8+ years closing residential and commercial deals.',
          experienceYears: 8,
          specialization: 'Park View City, Lahore',
          languages: ['Urdu', 'English', 'Punjabi'],
        },
      },
      socialLinks: {
        create: [{ platform: 'WHATSAPP', url: 'https://wa.me/923008499644' }],
      },
    },
  });

  // ---------------------------------------------------------------- Properties
  const propertyDefs = [
    {
      ref: 'UP-2026-00001',
      title: 'Modern 1 Kanal Villa',
      purpose: ListingPurpose.SALE,
      price: 65_000_000,
      area: 1,
      areaUnit: AreaUnit.KANAL,
      bedrooms: 5,
      bathrooms: 6,
      type: 'Villa',
      category: residential.id,
      status: 'Available',
      block: 'Tulip',
      featured: true,
      image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=900&q=80',
    },
    {
      ref: 'UP-2026-00002',
      title: 'Corner 5 Marla Plot',
      purpose: ListingPurpose.SALE,
      price: 18_500_000,
      area: 5,
      areaUnit: AreaUnit.MARLA,
      bedrooms: null,
      bathrooms: null,
      type: 'Plot',
      category: residential.id,
      status: 'Available',
      block: 'Rose',
      featured: false,
      image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=80',
    },
    {
      ref: 'UP-2026-00003',
      title: 'Elegant 10 Marla Home',
      purpose: ListingPurpose.SALE,
      price: 42_000_000,
      area: 10,
      areaUnit: AreaUnit.MARLA,
      bedrooms: 4,
      bathrooms: 4,
      type: 'House',
      category: residential.id,
      status: 'Available',
      block: 'Jasmine',
      featured: true,
      image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=900&q=80',
    },
  ];

  for (const [i, d] of propertyDefs.entries()) {
    const property = await prisma.property.upsert({
      where: { referenceCode: d.ref },
      update: {},
      create: {
        referenceCode: d.ref,
        title: d.title,
        slug: slugify(`${d.title}-${d.ref}`),
        description: `${d.title} in Park View City, Lahore. A premium listing from Unique Properties.`,
        purpose: d.purpose,
        price: d.price,
        currency: Currency.PKR,
        bedrooms: d.bedrooms ?? undefined,
        bathrooms: d.bathrooms ?? undefined,
        area: d.area,
        areaUnit: d.areaUnit,
        isFeatured: d.featured,
        isPublished: true,
        publishedAt: new Date(),
        typeId: types[d.type].id,
        categoryId: d.category,
        statusId: statuses[d.status].id,
        agentId: agent.id,
        createdById: admin.id,
        location: {
          create: {
            block: d.block,
            neighborhood: `${d.block} Block`,
            city: 'Lahore',
            // Approx. Park View City coordinates.
            latitude: 31.36 + i * 0.001,
            longitude: 74.25 + i * 0.001,
          },
        },
        images: {
          create: [{ url: d.image, isCover: true, sortOrder: 0, alt: d.title }],
        },
        features: {
          create: [
            { name: 'Block', value: d.block },
            { name: 'Year Built', value: '2025' },
          ],
        },
        amenities: {
          create: amenities.slice(0, 4).map((a) => ({ amenityId: a.id })),
        },
      },
    });

    if (d.featured) {
      await prisma.featuredProperty.upsert({
        where: { propertyId: property.id },
        update: { position: i },
        create: { propertyId: property.id, position: i },
      });
    }
  }

  // ---------------------------------------------------------------- Blog
  const author = await prisma.blogAuthor.upsert({
    where: { slug: 'unique-properties-team' },
    update: {},
    create: { name: 'Unique Properties Team', slug: 'unique-properties-team', adminId: admin.id },
  });
  const marketCat = await prisma.blogCategory.upsert({
    where: { slug: 'market-insights' },
    update: {},
    create: { name: 'Market Insights', slug: 'market-insights' },
  });
  const tag = await prisma.blogTag.upsert({
    where: { slug: 'lahore' },
    update: {},
    create: { name: 'Lahore', slug: 'lahore' },
  });
  const blog = await prisma.blog.upsert({
    where: { slug: 'lahore-real-estate-trends-2026' },
    update: {},
    create: {
      title: 'Lahore Real Estate Trends 2026 — Where Prices Are Heading',
      slug: 'lahore-real-estate-trends-2026',
      excerpt: 'Plot prices, rental yields, and the locations driving growth.',
      content: 'Park View City has matured into one of Lahore’s most sought-after addresses…',
      status: BlogStatus.PUBLISHED,
      publishedAt: new Date(),
      isFeatured: true,
      categoryId: marketCat.id,
      authorId: author.id,
      tags: { create: [{ tagId: tag.id }] },
    },
  });
  console.log(`   blog: ${blog.slug}`);

  // ---------------------------------------------------------------- Settings
  const settings: Array<[string, string, string]> = [
    ['site_name', 'Unique Properties', 'general'],
    ['contact_phone', '+92 300 8499644', 'contact'],
    ['contact_whatsapp', '923008499644', 'contact'],
    ['contact_email', 'info@uniqueproperties.pk', 'contact'],
  ];
  for (const [key, value, group] of settings) {
    await prisma.globalSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value, group },
    });
  }

  // ---------------------------------------------------------------- Homepage / testimonials / faqs
  await prisma.homepageSection.upsert({
    where: { key: 'hero' },
    update: {},
    create: {
      key: 'hero',
      title: 'Find Your Dream Property in Park View Lahore',
      subtitle: 'Premium listings. Trusted dealers. Honest advice.',
      sortOrder: 0,
    },
  });
  await prisma.testimonial.create({
    data: { name: 'Ali Raza', role: 'Homeowner', content: 'Smooth, transparent purchase. Highly recommended.', rating: 5 },
  }).catch(() => {}); // not unique-keyed; ignore if re-run
  await prisma.faq.create({
    data: { question: 'Do you handle both sale and rental?', answer: 'Yes — residential and commercial, sale and rent.', sortOrder: 0 },
  }).catch(() => {});

  console.log('✅  Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
