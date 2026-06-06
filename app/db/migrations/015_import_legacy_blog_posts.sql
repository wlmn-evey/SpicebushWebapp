-- Migration 015: Import 6 legacy blog posts (reconcile seed rows, then import).
-- Data migration only (no DDL). Idempotent: DELETE seed rows + INSERT ... ON CONFLICT DO NOTHING.
-- Reconciles the 6 seed-created date-prefixed rows (author_email='seed@spicebushmontessori.org'),
-- then imports the 6 posts under their clean slugs with author_email=NULL (rollback discriminator).
-- Applied MANUALLY at rollout via `npm run db:migrate` (NOT by the deploy path). See docs/runbooks/deploy.md.
-- NOTE: migration 014 has no transaction wrapper, so 015 adds its own BEGIN/COMMIT.

BEGIN;

-- 1. Reconcile: remove ONLY seed-authored, date-prefixed rows (idempotent).
DELETE FROM content
 WHERE type = 'blog'
   AND author_email = 'seed@spicebushmontessori.org'
   AND slug ~ '^\d{4}-\d{2}-\d{2}-';

-- 2. Import the 6 posts under clean slugs (ON CONFLICT DO NOTHING never clobbers owner-edited rows).

-- Post 1: Nurturing Growth: Spicebush Montessori's Gardening Program
INSERT INTO content (type, slug, title, data, status, author_email, created_at, updated_at)
VALUES (
  'blog',
  'nurturing-growth-gardening-program',
  'Nurturing Growth: Spicebush Montessori''s Gardening Program',
  jsonb_build_object(
    'title', 'Nurturing Growth: Spicebush Montessori''s Gardening Program',
    'date', '2024-05-20',
    'author', 'Spicebush Team',
    'excerpt', $blogex015$At Spicebush Montessori School, the educational approach extends beyond traditional classroom walls, embracing nature as a vital teacher. The gardening program is designed to do more than teach biology—it aims to help children understand themselves and their environment.$blogex015$,
    'image', '/images/blog/feature-image-wf-flame-lily-1.webp',
    'imageAlt', 'Bright orange and yellow flame lily flowers blooming in the school garden',
    'categories', jsonb_build_array('Education', 'Nature', 'Programs'),
    'tags', jsonb_build_array('gardening', 'responsibility', 'teamwork', 'nature', 'individualized learning'),
    'body', $blog015$At Spicebush Montessori School, the educational approach extends beyond
traditional classroom walls, embracing nature as a vital teacher. The gardening
program is designed to do more than teach biology—it aims to help children
understand themselves and their environment.

## A Personalized Approach to Learning

The school recognizes that "every child is unique, with their own interests,
learning pace, and curiosities." They provide individualized learning plans that
align with each child's developmental needs, creating an environment where every
learner can thrive.

## Learning Through Nature

The gardening program is more than a curriculum component—it's a journey into
nature. Children actively participate by:

- Planting
- Nurturing crops
- Harvesting their own produce

## Cultivating Essential Skills

Through gardening, students develop:

- **Responsibility** - Caring for living plants teaches children accountability
- **Patience** - Watching seeds grow into plants requires waiting and nurturing
- **Teamwork** - Working together in the garden builds collaboration skills

The garden serves as a metaphor for personal growth, teaching children that
dedicated care can lead to flourishing outcomes.

## Community of Learners

The mixed-age environment encourages:

- Peer learning
- Social skill development
- Mentorship between older and younger students

## Accessibility and Commitment

Spicebush Montessori offers a family individualized tuition program to make
Montessori education accessible to diverse families.

## Invitation to Explore

The school invites families to [schedule a tour](/admissions) and discover how
their environment can nurture children's growth and curiosity.$blog015$
  ),
  'published',
  NULL,
  '2024-05-20T12:00:00Z',
  '2024-05-20T12:00:00Z'
)
ON CONFLICT (type, slug) DO NOTHING;

-- Post 2: Exploring Summer Camp at Spicebush Montessori
INSERT INTO content (type, slug, title, data, status, author_email, created_at, updated_at)
VALUES (
  'blog',
  'exploring-summer-camp',
  'Exploring Summer Camp at Spicebush Montessori',
  jsonb_build_object(
    'title', 'Exploring Summer Camp at Spicebush Montessori',
    'date', '2024-06-05',
    'author', 'Spicebush Team',
    'excerpt', $blogex015$Summer camp at Spicebush Montessori is a carefully designed program that combines learning, exploration, and fun for children. The camp offers a unique experience focused on nature, agriculture, and hands-on discovery.$blogex015$,
    'image', '/images/blog/feature-image-wild-flowers-3.webp',
    'imageAlt', 'Wildflowers blooming in a meadow near Spicebush Montessori',
    'categories', jsonb_build_array('Programs', 'Summer', 'Nature'),
    'tags', jsonb_build_array('summer camp', 'farming', 'gardening', 'STEM', 'nature exploration'),
    'body', $blog015$Summer camp at Spicebush Montessori is a carefully designed program that
combines learning, exploration, and fun for children. The camp offers a unique
experience focused on nature, agriculture, and hands-on discovery.

## Summer Camp Themes

### 1. Farmyard Wonders

Children engage with farm artifacts and learn about animal care, exploring the
roles of farm animals and their ecological importance.

### 2. Gardening Week

Campers plant seeds, learn about plant life cycles, and develop a connection
with nature through hands-on gardening activities.

### 3. Exploration of Farm Vehicles

Children discover the mechanics behind tractors and farming tools through
STEM-focused activities.

### 4. Insect Investigations

Campers explore the world of insects through hunts, studying life cycles and
understanding their ecological roles.

### 5. Harvest Time

The summer concludes with a week of harvesting crops, learning about sustainable
food sources, and preparing snacks from freshly picked produce.

## Why Choose Spicebush Montessori's Summer Camp

The camp extends the Montessori educational philosophy by:

- Nurturing curiosity
- Promoting independence
- Building a sense of community
- Providing engaging and educational experiences

## Registration

Interested families are encouraged to [schedule a tour](/admissions) and secure
a spot in the summer program.$blog015$
  ),
  'published',
  NULL,
  '2024-06-05T12:00:00Z',
  '2024-06-05T12:00:00Z'
)
ON CONFLICT (type, slug) DO NOTHING;

-- Post 3: Embracing Neurodiversity: Strategies for ADHD
INSERT INTO content (type, slug, title, data, status, author_email, created_at, updated_at)
VALUES (
  'blog',
  'embracing-neurodiversity-adhd',
  'Embracing Neurodiversity: Strategies for ADHD',
  jsonb_build_object(
    'title', 'Embracing Neurodiversity: Strategies for ADHD',
    'date', '2024-07-17',
    'author', 'Spicebush Team',
    'excerpt', $blogex015$At Spicebush Montessori, the school emphasizes understanding and supporting neurodiversity as a core part of their educational philosophy. This article focuses on strategies for supporting students with ADHD, highlighting an inclusive approach to learning.$blogex015$,
    'image', '/images/blog/feature-image-wild-flowers-2.webp',
    'imageAlt', 'Colorful spring wildflowers in bloom near the school grounds',
    'categories', jsonb_build_array('Inclusion', 'Special Needs', 'Education'),
    'tags', jsonb_build_array('neurodiversity', 'ADHD', 'inclusion', 'individualized learning', 'positive behavior support'),
    'body', $blog015$At Spicebush Montessori, the school emphasizes understanding and supporting
neurodiversity as a core part of their educational philosophy. This article
focuses on strategies for supporting students with ADHD, highlighting an
inclusive approach to learning.

## Key Strategies

### 1. Tailored Learning Environments

The school creates adaptive classrooms that:

- Provide hands-on learning experiences
- Allow for movement and student choice
- Engage students through Montessori materials

### 2. Individualized Attention

Spicebush Montessori ensures:

- Personalized educational experiences
- Teachers trained to recognize student needs
- Flexible instruction based on individual requirements

### 3. Positive Behavior Support

Instead of punitive measures, the school uses:

- Positive reinforcement
- Strategies to improve self-esteem
- Helping students develop self-control

### 4. Collaborative Approach

The school advocates for:

- Communication between teachers and parents
- Involvement of healthcare professionals when appropriate
- Consistent support across home and school environments

## Philosophical Commitment

"We believe that every child, including those with ADHD, brings a unique set of
strengths and challenges to our classrooms."

The goal is to create an inclusive environment that values neurodiversity and
supports each student's individual learning journey.

## Conclusion

Spicebush Montessori is committed to providing an educational experience that
recognizes and celebrates the unique qualities of all students, particularly
those with neurodivergent traits.$blog015$
  ),
  'published',
  NULL,
  '2024-07-17T12:00:00Z',
  '2024-07-17T12:00:00Z'
)
ON CONFLICT (type, slug) DO NOTHING;

-- Post 4: Embracing Holistic Development: Spicebush Montessori's Educational Values
INSERT INTO content (type, slug, title, data, status, author_email, created_at, updated_at)
VALUES (
  'blog',
  'embracing-holistic-development',
  'Embracing Holistic Development: Spicebush Montessori''s Educational Values',
  jsonb_build_object(
    'title', 'Embracing Holistic Development: Spicebush Montessori''s Educational Values',
    'date', '2024-10-29',
    'author', 'Spicebush Team',
    'excerpt', $blogex015$Spicebush Montessori School in Glen Mills, Pennsylvania, is committed to holistic education guided by the SPICES framework: Social Justice, Peace, Inclusion, Community, Environment, and Simplicity. This Quaker-inspired approach integrates values into every aspect of the school's educational philosophy.$blogex015$,
    'image', '/images/blog/feature-image-wild-flowers-5.webp',
    'imageAlt', 'Spring wildflowers in shades of purple and white at Spicebush Montessori',
    'categories', jsonb_build_array('Philosophy', 'Values', 'Education'),
    'tags', jsonb_build_array('SPICES', 'holistic development', 'social justice', 'peace', 'inclusion', 'community', 'environment', 'simplicity'),
    'body', $blog015$Spicebush Montessori School in Glen Mills, Pennsylvania, is committed to
holistic education guided by the SPICES framework: Social Justice, Peace,
Inclusion, Community, Environment, and Simplicity. This Quaker-inspired approach
integrates values into every aspect of the school's educational philosophy.

## Key Values

### Social Justice

The curriculum is designed to raise children who are "aware of and engaged with
the issues of fairness and equity" through classroom discussions and community
service projects.

### Peace

Peace is cultivated through:

- Conflict resolution modeling
- Encouraging peaceful interactions
- Promoting understanding and respect

### Inclusion

The school creates an environment that:

- Honors diversity
- Supports different learning needs
- Ensures every child feels valued

### Community

Community involvement is emphasized through:

- Regular school events
- Workshops
- Activities that strengthen connections

### Environment

Environmental stewardship is practiced by:

- Incorporating nature into learning
- Conducting outdoor lessons
- Engaging in conservation projects

### Simplicity

The school promotes simplicity by:

- Creating focused classroom settings
- Encouraging appreciation of learning
- Minimizing material distractions

## Conclusion

Spicebush Montessori aims to prepare students to be "thoughtful, compassionate,
and responsible members of society" through this comprehensive educational
approach.$blog015$
  ),
  'published',
  NULL,
  '2024-10-29T12:00:00Z',
  '2024-10-29T12:00:00Z'
)
ON CONFLICT (type, slug) DO NOTHING;

-- Post 5: Exploring the Universe Within: Spicebush Montessori's Cosmic Curriculum
INSERT INTO content (type, slug, title, data, status, author_email, created_at, updated_at)
VALUES (
  'blog',
  'exploring-universe-within-cosmic-curriculum',
  'Exploring the Universe Within: Spicebush Montessori''s Cosmic Curriculum',
  jsonb_build_object(
    'title', 'Exploring the Universe Within: Spicebush Montessori''s Cosmic Curriculum',
    'date', '2024-10-29',
    'author', 'Spicebush Team',
    'excerpt', $blogex015$The article discusses Spicebush Montessori's unique educational approach centered on the 'cosmic curriculum' inspired by Dr. Maria Montessori's philosophy, helping children understand the interconnectedness of life and their role in the broader human social organization.$blogex015$,
    'image', '/images/blog/feature-image-wild-flowers-7.webp',
    'imageAlt', 'A meadow of mixed spring wildflowers under open sky',
    'categories', jsonb_build_array('Philosophy', 'Curriculum', 'Environment'),
    'tags', jsonb_build_array('cosmic curriculum', 'interconnectedness', 'peace education', 'environmental stewardship', 'holistic learning'),
    'body', $blog015$The article discusses Spicebush Montessori's unique educational approach
centered on the "cosmic curriculum" inspired by Dr. Maria Montessori's
philosophy. The core principles include understanding the interconnectedness of
life and teaching children about their role in the broader "human social
organization."

## Understanding the Cosmic Curriculum

The cosmic curriculum aims to help children understand the interconnectedness of
life, teaching them about their role in the broader "human social organization."

## Key Educational Principles

### 1. Fostering Connections with Nature

- Bringing children into close contact with the natural world
- Teaching respect and care for the environment

### 2. Cultivating Peace

- Nurturing children's inherent peace-loving nature
- Developing empathy and mutual understanding

### 3. Practical Learning

- Engaging students in real-life activities
- Exploring roles of animals, plants, and ecosystems

## Conflict Resolution and Community

The school emphasizes teaching children effective ways to:

- Resolve disagreements
- Respect different perspectives
- Create a harmonious community

## Outcome

Spicebush Montessori's approach creates "a community of learners who are not
only academically proficient but also deeply connected to their environment and
each other."

The article concludes by highlighting the school's commitment to holistic
education that prepares children to be "thoughtful leaders of tomorrow."$blog015$
  ),
  'published',
  NULL,
  '2024-10-29T12:00:00Z',
  '2024-10-29T12:00:00Z'
)
ON CONFLICT (type, slug) DO NOTHING;

-- Post 6: Welcome to Our New Blog
INSERT INTO content (type, slug, title, data, status, author_email, created_at, updated_at)
VALUES (
  'blog',
  'welcome-to-our-new-blog',
  'Welcome to Our New Blog',
  jsonb_build_object(
    'title', 'Welcome to Our New Blog',
    'date', '2025-07-26',
    'author', 'Spicebush Team',
    'excerpt', $blogex015$We're excited to share updates, resources, and stories from our Montessori community through our new blog platform.$blogex015$,
    'image', '/images/optimized/gallery/group/group-montessori-collaboration-img-6599-1362x2213-640w.jpg',
    'imageAlt', 'Students helping each other learn at Spicebush Montessori School',
    'seoTitle', 'Welcome to Spicebush Montessori School Blog',
    'seoDescription', 'Stay connected with our Montessori community through regular updates, educational resources, and stories from our school.',
    'categories', jsonb_build_array('News', 'Updates'),
    'body', $blog015$We're thrilled to launch our new blog platform! This space will be home to:

## What You'll Find Here

- **School Updates**: Important announcements and news
- **Educational Resources**: Montessori insights for families
- **Community Stories**: Celebrating our students and families
- **Event Highlights**: Recaps from school events and activities

## Staying Connected

Our goal is to keep our community informed and connected. Whether you're a
current family, prospective parent, or community member, this blog will provide
valuable insights into life at Spicebush Montessori.

## Get Involved

We'd love to hear from you! If you have story ideas or would like to contribute
to our blog, please reach out to us at information@spicebushmontessori.org.

Welcome to our new digital community space!$blog015$
  ),
  'published',
  NULL,
  '2025-07-26T12:00:00Z',
  '2025-07-26T12:00:00Z'
)
ON CONFLICT (type, slug) DO NOTHING;

COMMIT;
