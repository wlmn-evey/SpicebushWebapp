-- Migration: Import content from markdown files to Supabase
-- Generated on: 2025-07-27T20:23:26.889Z

-- blog collection

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'blog',
  '2024-05-20-nurturing-growth-gardening-program',
  'Nurturing Growth: Spicebush Montessori''s Gardening Program',
  '{"title":"Nurturing Growth: Spicebush Montessori''s Gardening Program","slug":"nurturing-growth-gardening-program","date":"2024-05-20T00:00:00.000Z","author":"Spicebush Team","categories":["Education","Nature","Programs"],"tags":["gardening","responsibility","teamwork","nature","individualized learning"],"featured_image":"/images/blog/feature-image-wf-flame-lily-1.webp","excerpt":"At Spicebush Montessori School, the educational approach extends beyond traditional classroom walls, embracing nature as a vital teacher. The gardening program is designed to do more than teach biology—it aims to help children understand themselves and their environment.","draft":false,"body":"At Spicebush Montessori School, the educational approach extends beyond traditional classroom walls, embracing nature as a vital teacher. The gardening program is designed to do more than teach biology—it aims to help children understand themselves and their environment.\n\n## A Personalized Approach to Learning\n\nThe school recognizes that \"every child is unique, with their own interests, learning pace, and curiosities.\" They provide individualized learning plans that align with each child''s developmental needs, creating an environment where every learner can thrive.\n\n## Learning Through Nature\n\nThe gardening program is more than a curriculum component—it''s a journey into nature. Children actively participate by:\n- Planting\n- Nurturing crops\n- Harvesting their own produce\n\n## Cultivating Essential Skills\n\nThrough gardening, students develop:\n- **Responsibility** - Caring for living plants teaches children accountability\n- **Patience** - Watching seeds grow into plants requires waiting and nurturing\n- **Teamwork** - Working together in the garden builds collaboration skills\n\nThe garden serves as a metaphor for personal growth, teaching children that dedicated care can lead to flourishing outcomes.\n\n## Community of Learners\n\nThe mixed-age environment encourages:\n- Peer learning\n- Social skill development\n- Mentorship between older and younger students\n\n## Accessibility and Commitment\n\nSpicebush Montessori offers a family individualized tuition program to make Montessori education accessible to diverse families.\n\n## Invitation to Explore\n\nThe school invites families to [schedule a tour](/contact) and discover how their environment can nurture children''s growth and curiosity."}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'blog',
  '2024-06-05-exploring-summer-camp',
  'Exploring Summer Camp at Spicebush Montessori',
  '{"title":"Exploring Summer Camp at Spicebush Montessori","slug":"exploring-summer-camp","date":"2024-06-05T00:00:00.000Z","author":"Spicebush Team","categories":["Programs","Summer","Nature"],"tags":["summer camp","farming","gardening","STEM","nature exploration"],"featured_image":"/images/blog/feature-image-wild-flowers-3.webp","excerpt":"Summer camp at Spicebush Montessori is a carefully designed program that combines learning, exploration, and fun for children. The camp offers a unique experience focused on nature, agriculture, and hands-on discovery.","draft":false,"body":"Summer camp at Spicebush Montessori is a carefully designed program that combines learning, exploration, and fun for children. The camp offers a unique experience focused on nature, agriculture, and hands-on discovery.\n\n## Summer Camp Themes\n\n### 1. Farmyard Wonders\nChildren engage with farm artifacts and learn about animal care, exploring the roles of farm animals and their ecological importance.\n\n### 2. Gardening Week\nCampers plant seeds, learn about plant life cycles, and develop a connection with nature through hands-on gardening activities.\n\n### 3. Exploration of Farm Vehicles\nChildren discover the mechanics behind tractors and farming tools through STEM-focused activities.\n\n### 4. Insect Investigations\nCampers explore the world of insects through hunts, studying life cycles and understanding their ecological roles.\n\n### 5. Harvest Time\nThe summer concludes with a week of harvesting crops, learning about sustainable food sources, and preparing snacks from freshly picked produce.\n\n## Why Choose Spicebush Montessori''s Summer Camp\n\nThe camp extends the Montessori educational philosophy by:\n- Nurturing curiosity\n- Promoting independence\n- Building a sense of community\n- Providing engaging and educational experiences\n\n## Registration\n\nInterested families are encouraged to [schedule a tour](/contact) and secure a spot in the summer program."}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'blog',
  '2024-07-17-embracing-neurodiversity-adhd',
  'Embracing Neurodiversity: Strategies for ADHD',
  '{"title":"Embracing Neurodiversity: Strategies for ADHD","slug":"embracing-neurodiversity-adhd","date":"2024-07-17T00:00:00.000Z","author":"Spicebush Team","categories":["Inclusion","Special Needs","Education"],"tags":["neurodiversity","ADHD","inclusion","individualized learning","positive behavior support"],"featured_image":"/images/blog/feature-image-wild-flowers-2.webp","excerpt":"At Spicebush Montessori, the school emphasizes understanding and supporting neurodiversity as a core part of their educational philosophy. This article focuses on strategies for supporting students with ADHD, highlighting an inclusive approach to learning.","draft":false,"body":"At Spicebush Montessori, the school emphasizes understanding and supporting neurodiversity as a core part of their educational philosophy. This article focuses on strategies for supporting students with ADHD, highlighting an inclusive approach to learning.\n\n## Key Strategies\n\n### 1. Tailored Learning Environments\n\nThe school creates adaptive classrooms that:\n- Provide hands-on learning experiences\n- Allow for movement and student choice\n- Engage students through Montessori materials\n\n### 2. Individualized Attention\n\nSpicebush Montessori ensures:\n- Personalized educational experiences\n- Teachers trained to recognize student needs\n- Flexible instruction based on individual requirements\n\n### 3. Positive Behavior Support\n\nInstead of punitive measures, the school uses:\n- Positive reinforcement\n- Strategies to improve self-esteem\n- Helping students develop self-control\n\n### 4. Collaborative Approach\n\nThe school advocates for:\n- Communication between teachers and parents\n- Involvement of healthcare professionals when appropriate\n- Consistent support across home and school environments\n\n## Philosophical Commitment\n\n\"We believe that every child, including those with ADHD, brings a unique set of strengths and challenges to our classrooms.\"\n\nThe goal is to create an inclusive environment that values neurodiversity and supports each student''s individual learning journey.\n\n## Conclusion\n\nSpicebush Montessori is committed to providing an educational experience that recognizes and celebrates the unique qualities of all students, particularly those with neurodivergent traits."}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'blog',
  '2024-10-29-embracing-holistic-development',
  'Embracing Holistic Development: Spicebush Montessori''s Educational Values',
  '{"title":"Embracing Holistic Development: Spicebush Montessori''s Educational Values","slug":"embracing-holistic-development","date":"2024-10-29T00:00:00.000Z","author":"Spicebush Team","categories":["Philosophy","Values","Education"],"tags":["SPICES","holistic development","social justice","peace","inclusion","community","environment","simplicity"],"featured_image":"/images/blog/feature-image-wild-flowers-5.webp","excerpt":"Spicebush Montessori School in Glen Mills, Pennsylvania, is committed to holistic education guided by the SPICES framework: Social Justice, Peace, Inclusion, Community, Environment, and Simplicity. This Quaker-inspired approach integrates values into every aspect of the school''s educational philosophy.","draft":false,"body":"Spicebush Montessori School in Glen Mills, Pennsylvania, is committed to holistic education guided by the SPICES framework: Social Justice, Peace, Inclusion, Community, Environment, and Simplicity. This Quaker-inspired approach integrates values into every aspect of the school''s educational philosophy.\n\n## Key Values\n\n### Social Justice\nThe curriculum is designed to raise children who are \"aware of and engaged with the issues of fairness and equity\" through classroom discussions and community service projects.\n\n### Peace\nPeace is cultivated through:\n- Conflict resolution modeling\n- Encouraging peaceful interactions\n- Promoting understanding and respect\n\n### Inclusion\nThe school creates an environment that:\n- Honors diversity\n- Supports different learning needs\n- Ensures every child feels valued\n\n### Community\nCommunity involvement is emphasized through:\n- Regular school events\n- Workshops\n- Activities that strengthen connections\n\n### Environment\nEnvironmental stewardship is practiced by:\n- Incorporating nature into learning\n- Conducting outdoor lessons\n- Engaging in conservation projects\n\n### Simplicity\nThe school promotes simplicity by:\n- Creating focused classroom settings\n- Encouraging appreciation of learning\n- Minimizing material distractions\n\n## Conclusion\n\nSpicebush Montessori aims to prepare students to be \"thoughtful, compassionate, and responsible members of society\" through this comprehensive educational approach."}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'blog',
  '2024-10-29-exploring-universe-within-cosmic-curriculum',
  'Exploring the Universe Within: Spicebush Montessori''s Cosmic Curriculum',
  '{"title":"Exploring the Universe Within: Spicebush Montessori''s Cosmic Curriculum","slug":"exploring-universe-within-cosmic-curriculum","date":"2024-10-29T00:00:00.000Z","author":"Spicebush Team","categories":["Philosophy","Curriculum","Environment"],"tags":["cosmic curriculum","interconnectedness","peace education","environmental stewardship","holistic learning"],"featured_image":"/images/blog/feature-image-wild-flowers-7.webp","excerpt":"The article discusses Spicebush Montessori''s unique educational approach centered on the ''cosmic curriculum'' inspired by Dr. Maria Montessori''s philosophy, helping children understand the interconnectedness of life and their role in the broader human social organization.","draft":false,"body":"The article discusses Spicebush Montessori''s unique educational approach centered on the \"cosmic curriculum\" inspired by Dr. Maria Montessori''s philosophy. The core principles include understanding the interconnectedness of life and teaching children about their role in the broader \"human social organization.\"\n\n## Understanding the Cosmic Curriculum\n\nThe cosmic curriculum aims to help children understand the interconnectedness of life, teaching them about their role in the broader \"human social organization.\"\n\n## Key Educational Principles\n\n### 1. Fostering Connections with Nature\n- Bringing children into close contact with the natural world\n- Teaching respect and care for the environment\n\n### 2. Cultivating Peace\n- Nurturing children''s inherent peace-loving nature\n- Developing empathy and mutual understanding\n\n### 3. Practical Learning\n- Engaging students in real-life activities\n- Exploring roles of animals, plants, and ecosystems\n\n## Conflict Resolution and Community\n\nThe school emphasizes teaching children effective ways to:\n- Resolve disagreements\n- Respect different perspectives\n- Create a harmonious community\n\n## Outcome\n\nSpicebush Montessori''s approach creates \"a community of learners who are not only academically proficient but also deeply connected to their environment and each other.\"\n\nThe article concludes by highlighting the school''s commitment to holistic education that prepares children to be \"thoughtful leaders of tomorrow.\""}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'blog',
  '2025-07-26-welcome-to-our-new-blog',
  'Welcome to Our New Blog',
  '{"title":"Welcome to Our New Blog","date":"2025-07-26T00:00:00.000Z","author":"Spicebush Team","categories":["News","Updates"],"image":"/images/optimized/gallery/group/group-montessori-collaboration-img-6599-1362x2213-640w.jpg","imageAlt":"Students helping each other learn at Spicebush Montessori School","excerpt":"We''re excited to share updates, resources, and stories from our Montessori community through our new blog platform.","seoTitle":"Welcome to Spicebush Montessori School Blog","seoDescription":"Stay connected with our Montessori community through regular updates, educational resources, and stories from our school.","draft":false,"body":"We''re thrilled to launch our new blog platform! This space will be home to:\n\n## What You''ll Find Here\n\n- **School Updates**: Important announcements and news\n- **Educational Resources**: Montessori insights for families\n- **Community Stories**: Celebrating our students and families\n- **Event Highlights**: Recaps from school events and activities\n\n## Staying Connected\n\nOur goal is to keep our community informed and connected. Whether you''re a current family, prospective parent, or community member, this blog will provide valuable insights into life at Spicebush Montessori.\n\n## Get Involved\n\nWe''d love to hear from you! If you have story ideas or would like to contribute to our blog, please reach out to us at information@spicebushmontessori.org.\n\nWelcome to our new digital community space!"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

-- staff collection

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'staff',
  'kira-messinger',
  'Kira Messinger',
  '{"name":"Kira Messinger","role":"Montessori Teacher & Nature Guide","photo":"/images/optimized/teachers/teachers-kira-messinger-assistant-teacher-640w.webp","email":"kira@spicebushmontessori.org","credentials":["Environmental Education Certificate"],"languages":["English"],"startYear":2023,"order":3,"body":"Kira brings a special passion for connecting children with the natural world. Her expertise in environmental education perfectly complements our gardening and outdoor programs. She has remarkable patience and skill in guiding children through their natural curiosity about the world around them. Kira''s approach helps children develop both independence and a deep respect for their environment, embodying our SPICES values of environmental stewardship and simplicity."}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'staff',
  'kirsti-forrest',
  'Kirsti Forrest',
  '{"name":"Kirsti Forrest","role":"Lead Montessori Teacher","photo":"/images/optimized/teachers/teachers-kirsti-forrest-head-teacher-640w.webp","email":"kirsti@spicebushmontessori.org","credentials":["AMS Montessori Certification","B.A. in Education"],"languages":["English"],"startYear":2021,"order":1,"body":"Kirsti brings deep understanding of Montessori philosophy and practice to Spicebush. She has a gift for seeing each child''s unique potential and creating environments where they can flourish. Parents consistently praise her patience, insight, and ability to guide children toward independence and confidence. Kirsti has been with Spicebush since our founding and has been instrumental in creating our nurturing, child-centered community."}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'staff',
  'leah-walker',
  'Leah Walker',
  '{"name":"Leah Walker","role":"Montessori Teacher","photo":"/images/optimized/teachers/teachers-leah-walker-lead-teacher-640w.webp","email":"leah@spicebushmontessori.org","credentials":["AMS Montessori Certification","B.S. in Child Development"],"languages":["English"],"startYear":2022,"order":2,"body":"Leah''s warm and gentle approach creates a safe space where children feel comfortable exploring and taking risks in their learning. She has exceptional skills in observing children and understanding their developmental needs. Leah''s collaborative work with Kirsti has created a beautiful classroom environment where children of all ages learn together harmoniously. Parents appreciate her thoughtful communication and deep care for each child''s growth."}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

-- hours collection

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'hours',
  'friday',
  'friday',
  '{"day":"Friday","open_time":"8:30 AM","close_time":"3:00 PM","is_closed":false,"note":"No extended care on Fridays","order":5,"body":"EOF < /dev/null"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'hours',
  'monday',
  'monday',
  '{"day":"Monday","open_time":"8:30 AM","close_time":"5:30 PM","is_closed":false,"note":"Extended care available until 5:30 PM","order":1,"body":"# Monday Schedule\n\nOur Monday schedule provides a full day of Montessori learning and exploration. Children arrive for a peaceful start to the week, with opportunities for both indoor learning and outdoor discovery.\nEOF < /dev/null"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'hours',
  'saturday',
  'saturday',
  '{"day":"Saturday","open_time":"","close_time":"","is_closed":true,"note":"School closed - family time","order":6,"body":"# Saturday Hours\n\n**School is Closed**\n\n## Weekend Family Time\nSaturdays are reserved for family time and rest. Our Montessori philosophy emphasizes the importance of family bonding and unstructured play time.\n\n## Emergency Contact\nFor urgent matters involving enrolled children, families have access to emergency contact information provided separately.\n\n## Upcoming Week Preparation\nStaff may use Saturdays for classroom preparation and professional development, but no student programming is available."}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'hours',
  'sunday',
  'sunday',
  '{"day":"Sunday","open_time":"","close_time":"","is_closed":true,"note":"School closed - family time","order":7,"body":"# Sunday Hours\n\n**School is Closed**\n\n## Weekend Family Time\nSundays are dedicated to family time, rest, and preparation for the upcoming school week. We encourage families to enjoy unstructured time together.\n\n## Week Ahead\nSunday evening is a great time to prepare for the upcoming school week:\n- Review the weekly newsletter for special events\n- Prepare school bags and lunch items\n- Ensure children get adequate rest before Monday\n\n## Emergency Contact\nFor urgent matters involving enrolled children, families have access to emergency contact information provided separately."}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'hours',
  'thursday',
  'thursday',
  '{"day":"Thursday","open_time":"8:30 AM","close_time":"5:30 PM","is_closed":false,"note":"Extended care available until 5:30 PM","order":4,"body":"EOF < /dev/null"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'hours',
  'tuesday',
  'tuesday',
  '{"day":"Tuesday","open_time":"8:30 AM","close_time":"5:30 PM","is_closed":false,"note":"Extended care available until 5:30 PM","order":2,"body":"EOF < /dev/null"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'hours',
  'wednesday',
  'wednesday',
  '{"day":"Wednesday","open_time":"8:30 AM","close_time":"5:30 PM","is_closed":false,"note":"Extended care available until 5:30 PM","order":3,"body":"EOF < /dev/null"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

-- tuition collection

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'tuition',
  'full-day-3-days-twr',
  'Full Day - 3 Days (TWR)',
  '{"type":"program","name":"Full Day - 3 Days (TWR)","program_type":"Full Day","days_per_week":3,"daily_hours":6.5,"description":"Tuesday, Wednesday, Thursday, 8:30 AM - 3:00 PM","display_order":2,"active":true,"body":"# Full Day - 3 Days (TWR) Program\n\nOur three-day full program offers a balanced Montessori experience with more family time while maintaining educational continuity. Children attend Tuesday, Wednesday, and Thursday for full days.\n\n## Schedule\n- **Days:** Tuesday, Wednesday, Thursday\n- **Hours:** 8:30 AM - 3:00 PM (6.5 hours daily)\n- **Total Weekly Hours:** 19.5 hours\n\n## Program Features\n- Complete three-hour morning work cycle\n- Lunch and rest period\n- Afternoon activities and outdoor time\n- Extended care available on program days until 5:30 PM\n\n## Ideal For\n- Families wanting extended family time\n- Children transitioning to longer programs\n- Families with flexible schedules\n- Budget-conscious families seeking quality education\n\nExtended care is available Tuesday through Thursday from 3:00 PM to 5:30 PM for an additional fee. This schedule provides excellent educational continuity while allowing for extended family time on Mondays and Fridays."}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'tuition',
  'full-day-5-days',
  'Full Day - 5 Days',
  '{"type":"program","name":"Full Day - 5 Days","program_type":"Full Day","days_per_week":5,"daily_hours":6.5,"description":"Monday through Friday, 8:30 AM - 3:00 PM","display_order":1,"active":true,"body":"# Full Day - 5 Days Program\n\nOur comprehensive full-day program offers a complete Montessori educational experience five days a week. This program provides children with extended time to engage deeply with our mixed-age learning environment and complete three-hour work cycles.\n\n## Schedule\n- **Days:** Monday through Friday\n- **Hours:** 8:30 AM - 3:00 PM (6.5 hours daily)\n- **Total Weekly Hours:** 32.5 hours\n\n## Program Features\n- Complete three-hour morning work cycle\n- Lunch and rest period\n- Afternoon activities and outdoor time\n- Extended care available (Monday-Thursday until 5:30 PM)\n\n## Ideal For\n- Working families needing full-day care\n- Children who thrive with longer engagement periods\n- Families seeking a comprehensive Montessori experience\n\nExtended care is available Monday through Thursday from 3:00 PM to 5:30 PM for an additional fee."}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'tuition',
  'half-day-3-days-twr-program',
  'Half Day - 3 Days (TWR)',
  '{"type":"program","name":"Half Day - 3 Days (TWR)","program_type":"Half Day","days_per_week":3,"daily_hours":3.5,"description":"Tuesday, Wednesday, Thursday, 8:30 AM - 12:00 PM","display_order":4,"active":true,"body":"# Half Day - 3 Days (TWR) Program\n\nOur three-day half program provides an excellent introduction to Montessori education with maximum flexibility for families. Children attend Tuesday, Wednesday, and Thursday mornings.\n\n## Schedule\n- **Days:** Tuesday, Wednesday, Thursday  \n- **Hours:** 8:30 AM - 12:00 PM (3.5 hours daily)\n- **Total Weekly Hours:** 10.5 hours\n\n## Program Features\n- Complete three-hour Montessori work cycle\n- Snack time\n- Outdoor activities (weather permitting)\n- Mixed-age learning environment\n\n## Ideal For\n- Families seeking maximum scheduling flexibility\n- Children new to Montessori education\n- Budget-conscious families\n- Families with stay-at-home caregivers\n\nThis program offers our most affordable option while maintaining the core Montessori educational experience. Extended care is not available for half-day programs."}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'tuition',
  'half-day-3-days-twr',
  'half-day-3-days-twr',
  '{"type":"rate","rate_label":"Half Day","program_id":"half-day-3-days-twr-program","tuition_price":10000,"extended_care_price":0,"extended_care_available":false,"is_constant_rate":true,"school_year":"2025-2026","income_threshold_type":"Greater Than or Equal To","display_order":1,"active":true,"body":"# Half Day - 3 Days (TWR) Tuition\n\nOur most flexible program option provides quality Montessori education three mornings a week at an accessible rate.\n\n## Tuition Rate\n- **Annual Tuition:** $10,000\n- **Program:** Half Day - 3 Days (Tuesday-Thursday, 8:30 AM - 12:00 PM)\n- **School Year:** 2025-2026\n\n## Rate Structure\nThis is a fixed tuition rate that applies to all families regardless of income level. This represents our most affordable program option while maintaining educational quality.\n\n## What''s Included\n- Complete three-hour Montessori work cycle\n- Snack time\n- Outdoor activities (weather permitting)\n- All educational materials and supplies\n- Progress assessments and conferences\n\n## Payment Options\n- Annual payment (discount may apply)\n- Monthly payment plan available\n- Financial aid available based on need\n\nExtended care is not available for half-day programs. This program is perfect for families seeking an introduction to Montessori education with maximum scheduling flexibility."}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'tuition',
  'half-day-5-days-program',
  'Half Day - 5 Days',
  '{"type":"program","name":"Half Day - 5 Days","program_type":"Half Day","days_per_week":5,"daily_hours":3.5,"description":"Monday through Friday, 8:30 AM - 12:00 PM","display_order":3,"active":true,"body":"# Half Day - 5 Days Program\n\nOur five-day half program provides consistent daily Montessori education with mornings dedicated to learning and afternoons available for family time. Children attend Monday through Friday mornings.\n\n## Schedule\n- **Days:** Monday through Friday\n- **Hours:** 8:30 AM - 12:00 PM (3.5 hours daily)\n- **Total Weekly Hours:** 17.5 hours\n\n## Program Features\n- Complete three-hour Montessori work cycle\n- Snack time\n- Outdoor activities (weather permitting)\n- Mixed-age learning environment\n- Consistent daily routine\n\n## Ideal For\n- Working families needing morning care\n- Children who benefit from daily routine\n- Families seeking affordable quality education\n- Children preparing for full-day programs\n\nThis program provides excellent educational value with the consistency of daily attendance while keeping costs manageable. Extended care is not available for half-day programs."}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'tuition',
  'half-day-5-days',
  'half-day-5-days',
  '{"type":"rate","rate_label":"Half Day","program_id":"half-day-5-days-program","tuition_price":12000,"extended_care_price":0,"extended_care_available":false,"is_constant_rate":true,"school_year":"2025-2026","income_threshold_type":"Greater Than or Equal To","display_order":1,"active":true,"body":"# Half Day - 5 Days Tuition\n\nOur half-day five-day program offers consistent, affordable Montessori education Monday through Friday mornings.\n\n## Tuition Rate\n- **Annual Tuition:** $12,000\n- **Program:** Half Day - 5 Days (Monday-Friday, 8:30 AM - 12:00 PM)\n- **School Year:** 2025-2026\n\n## Rate Structure\nThis is a fixed tuition rate that applies to all families regardless of income level. The rate reflects the core educational program without income-based adjustments.\n\n## What''s Included\n- Complete three-hour Montessori work cycle\n- Snack time\n- Outdoor activities (weather permitting)\n- All educational materials and supplies\n- Progress assessments and conferences\n\n## Payment Options\n- Annual payment (discount may apply)\n- Monthly payment plan available\n- Financial aid available based on need\n\nExtended care is not available for half-day programs."}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'tuition',
  'tuition-a-full-day-3-days-twr',
  'tuition-a-full-day-3-days-twr',
  '{"type":"rate","rate_label":"Tuition A","program_id":"full-day-3-days-twr","tuition_price":10822,"extended_care_price":4000,"extended_care_available":true,"is_constant_rate":false,"school_year":"2025-2026","income_threshold_type":"Greater Than or Equal To","income_threshold_family_2":84976,"income_threshold_family_3":110240,"income_threshold_family_4":128750,"income_threshold_family_5":150380,"income_threshold_family_6":172525,"income_threshold_family_7":195597,"income_threshold_family_8_plus":216300,"display_order":2,"active":true,"body":"# Tuition A - Full Day 3 Days (TWR)\n\nOur full-tuition rate for families with higher household incomes seeking our flexible three-day program.\n\n## Tuition Rate\n- **Annual Tuition:** $10,822\n- **Extended Care:** $4,000 annually (available Tuesday-Thursday)\n- **Program:** Full Day - 3 Days (Tuesday-Thursday, 8:30 AM - 3:00 PM)\n- **School Year:** 2025-2026\n\n## Income Qualifications\nThis rate applies to families with household income at or above:\n- **2-person household:** $84,976\n- **3-person household:** $110,240\n- **4-person household:** $128,750\n- **5-person household:** $150,380\n- **6-person household:** $172,525\n- **7-person household:** $195,597\n- **8+ person household:** $216,300\n\n## What''s Included\n- Complete three-hour morning work cycle\n- Lunch and rest period\n- Afternoon activities and outdoor time\n- All educational materials and supplies\n- Progress assessments and conferences\n\n## Extended Care Option\nExtended care is available Tuesday through Thursday from 3:00 PM to 5:30 PM for an additional $4,000 annually.\n\nThis three-day option provides excellent work-life balance while maintaining educational continuity. Families paying full tuition help subsidize reduced rates for families with lower incomes."}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'tuition',
  'tuition-a-full-day-5-days',
  'tuition-a-full-day-5-days',
  '{"type":"rate","rate_label":"Tuition A","program_id":"full-day-5-days","tuition_price":18035,"extended_care_price":4000,"extended_care_available":true,"is_constant_rate":false,"school_year":"2025-2026","income_threshold_type":"Greater Than or Equal To","income_threshold_family_2":84976,"income_threshold_family_3":110240,"income_threshold_family_4":128750,"income_threshold_family_5":150380,"income_threshold_family_6":172525,"income_threshold_family_7":195597,"income_threshold_family_8_plus":216300,"display_order":2,"active":true,"body":"# Tuition A - Full Day 5 Days\n\nOur full-tuition rate for families with higher household incomes who want to support our mission of accessible Montessori education.\n\n## Tuition Rate\n- **Annual Tuition:** $18,035\n- **Extended Care:** $4,000 annually (available Monday-Thursday)\n- **Program:** Full Day - 5 Days (Monday-Friday, 8:30 AM - 3:00 PM)\n- **School Year:** 2025-2026\n\n## Income Qualifications\nThis rate applies to families with household income at or above:\n- **2-person household:** $84,976\n- **3-person household:** $110,240\n- **4-person household:** $128,750\n- **5-person household:** $150,380\n- **6-person household:** $172,525\n- **7-person household:** $195,597\n- **8+ person household:** $216,300\n\n## What''s Included\n- Complete three-hour morning work cycle\n- Lunch and rest period\n- Afternoon activities and outdoor time\n- All educational materials and supplies\n- Progress assessments and conferences\n\n## Extended Care Option\nExtended care is available Monday through Thursday from 3:00 PM to 5:30 PM for an additional $4,000 annually. Friday pickup is at 3:00 PM sharp.\n\nFamilies paying full tuition help subsidize reduced rates for families with lower incomes, supporting our commitment to economic diversity."}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'tuition',
  'tuition-b-full-day-3-days-twr',
  'tuition-b-full-day-3-days-twr',
  '{"type":"rate","rate_label":"Tuition B","program_id":"full-day-3-days-twr","tuition_price":8609.5,"extended_care_price":3800,"extended_care_available":true,"is_constant_rate":false,"school_year":"2025-2026","income_threshold_type":"Greater Than or Equal To","income_threshold_family_2":65405,"income_threshold_family_3":82400,"income_threshold_family_4":99498,"income_threshold_family_5":113000,"income_threshold_family_6":133900,"income_threshold_family_7":150380,"income_threshold_family_8_plus":167890,"display_order":3,"active":true,"body":"# Tuition B - Full Day 3 Days (TWR)\n\nReduced tuition rate for middle-income families seeking our flexible three-day full program.\n\n## Tuition Rate\n- **Annual Tuition:** $8,609.50\n- **Extended Care:** $3,800 annually (available Tuesday-Thursday)\n- **Program:** Full Day - 3 Days (Tuesday-Thursday, 8:30 AM - 3:00 PM)\n- **School Year:** 2025-2026\n\n## Income Qualifications\nThis rate applies to families with household income at or above:\n- **2-person household:** $65,405\n- **3-person household:** $82,400\n- **4-person household:** $99,498\n- **5-person household:** $113,000\n- **6-person household:** $133,900\n- **7-person household:** $150,380\n- **8+ person household:** $167,890\n\n## What''s Included\n- Complete three-hour morning work cycle\n- Lunch and rest period\n- Afternoon activities and outdoor time\n- All educational materials and supplies\n- Progress assessments and conferences\n\n## Extended Care Option\nExtended care is available Tuesday through Thursday from 3:00 PM to 5:30 PM for an additional $3,800 annually.\n\nThis three-day option combines affordability with flexibility while maintaining high educational standards."}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'tuition',
  'tuition-b-full-day-5-days',
  'tuition-b-full-day-5-days',
  '{"type":"rate","rate_label":"Tuition B","program_id":"full-day-5-days","tuition_price":14348.75,"extended_care_price":3800,"extended_care_available":true,"is_constant_rate":false,"school_year":"2025-2026","income_threshold_type":"Greater Than or Equal To","income_threshold_family_2":65405,"income_threshold_family_3":82400,"income_threshold_family_4":99498,"income_threshold_family_5":113000,"income_threshold_family_6":133900,"income_threshold_family_7":150380,"income_threshold_family_8_plus":167890,"display_order":3,"active":true,"body":"# Tuition B - Full Day 5 Days\n\nReduced tuition rate for middle-income families seeking full-day Montessori education.\n\n## Tuition Rate\n- **Annual Tuition:** $14,348.75\n- **Extended Care:** $3,800 annually (available Monday-Thursday)\n- **Program:** Full Day - 5 Days (Monday-Friday, 8:30 AM - 3:00 PM)\n- **School Year:** 2025-2026\n\n## Income Qualifications\nThis rate applies to families with household income at or above:\n- **2-person household:** $65,405\n- **3-person household:** $82,400\n- **4-person household:** $99,498\n- **5-person household:** $113,000\n- **6-person household:** $133,900\n- **7-person household:** $150,380\n- **8+ person household:** $167,890\n\n## What''s Included\n- Complete three-hour morning work cycle\n- Lunch and rest period\n- Afternoon activities and outdoor time\n- All educational materials and supplies\n- Progress assessments and conferences\n\n## Extended Care Option\nExtended care is available Monday through Thursday from 3:00 PM to 5:30 PM for an additional $3,800 annually. Friday pickup is at 3:00 PM sharp.\n\nThis rate provides significant tuition assistance while maintaining the full educational program quality."}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'tuition',
  'tuition-c-full-day-3-days-twr',
  'tuition-c-full-day-3-days-twr',
  '{"type":"rate","rate_label":"Tuition C","program_id":"full-day-3-days-twr","tuition_price":6783,"extended_care_price":3400,"extended_care_available":true,"is_constant_rate":false,"school_year":"2025-2026","income_threshold_type":"Greater Than or Equal To","income_threshold_family_2":34480,"income_threshold_family_3":43440,"income_threshold_family_4":52400,"income_threshold_family_5":61350,"income_threshold_family_6":70320,"income_threshold_family_7":79280,"income_threshold_family_8_plus":88240,"display_order":4,"active":true,"body":"# Tuition C - Full Day 3 Days (TWR)\n\nSubstantial tuition assistance for lower-middle income families seeking our three-day program.\n\n## Tuition Rate\n- **Annual Tuition:** $6,783\n- **Extended Care:** $3,400 annually (available Tuesday-Thursday)\n- **Program:** Full Day - 3 Days (Tuesday-Thursday, 8:30 AM - 3:00 PM)\n- **School Year:** 2025-2026\n\n## Income Qualifications\nThis rate applies to families with household income at or above:\n- **2-person household:** $34,480\n- **3-person household:** $43,440\n- **4-person household:** $52,400\n- **5-person household:** $61,350\n- **6-person household:** $70,320\n- **7-person household:** $79,280\n- **8+ person household:** $88,240\n\n## What''s Included\n- Complete three-hour morning work cycle\n- Lunch and rest period\n- Afternoon activities and outdoor time\n- All educational materials and supplies\n- Progress assessments and conferences\n\n## Extended Care Option\nExtended care is available Tuesday through Thursday from 3:00 PM to 5:30 PM for an additional $3,400 annually.\n\nThis rate makes quality Montessori education accessible to more families while maintaining our three-day flexibility."}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'tuition',
  'tuition-c-full-day-5-days',
  'tuition-c-full-day-5-days',
  '{"type":"rate","rate_label":"Tuition C","program_id":"full-day-5-days","tuition_price":11304,"extended_care_price":3400,"extended_care_available":true,"is_constant_rate":false,"school_year":"2025-2026","income_threshold_type":"Greater Than or Equal To","income_threshold_family_2":34480,"income_threshold_family_3":43440,"income_threshold_family_4":52400,"income_threshold_family_5":61350,"income_threshold_family_6":70320,"income_threshold_family_7":79280,"income_threshold_family_8_plus":88240,"display_order":4,"active":true,"body":"# Tuition C - Full Day 5 Days\n\nSubstantial tuition assistance for lower-middle income families seeking full-day care.\n\n## Tuition Rate\n- **Annual Tuition:** $11,304\n- **Extended Care:** $3,400 annually (available Monday-Thursday)\n- **Program:** Full Day - 5 Days (Monday-Friday, 8:30 AM - 3:00 PM)\n- **School Year:** 2025-2026\n\n## Income Qualifications\nThis rate applies to families with household income at or above:\n- **2-person household:** $34,480\n- **3-person household:** $43,440\n- **4-person household:** $52,400\n- **5-person household:** $61,350\n- **6-person household:** $70,320\n- **7-person household:** $79,280\n- **8+ person household:** $88,240\n\n## What''s Included\n- Complete three-hour morning work cycle\n- Lunch and rest period\n- Afternoon activities and outdoor time\n- All educational materials and supplies\n- Progress assessments and conferences\n\n## Extended Care Option\nExtended care is available Monday through Thursday from 3:00 PM to 5:30 PM for an additional $3,400 annually. Friday pickup is at 3:00 PM sharp.\n\nThis rate provides significant financial assistance while maintaining the same high-quality educational experience as all our programs."}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'tuition',
  'tuition-d-full-day-3-days-twr',
  'tuition-d-full-day-3-days-twr',
  '{"type":"rate","rate_label":"Tuition D","program_id":"full-day-3-days-twr","tuition_price":3244,"extended_care_price":0,"extended_care_available":true,"is_constant_rate":false,"school_year":"2025-2026","income_threshold_type":"Less Than","income_threshold_family_2":34480,"income_threshold_family_3":43440,"income_threshold_family_4":52400,"income_threshold_family_5":61350,"income_threshold_family_6":70320,"income_threshold_family_7":79280,"income_threshold_family_8_plus":88240,"display_order":5,"active":true,"body":"# Tuition D - Full Day 3 Days (TWR)\n\nMaximum tuition assistance for families with the greatest financial need seeking our three-day program.\n\n## Tuition Rate\n- **Annual Tuition:** $3,244\n- **Extended Care:** Included at no additional cost (available Tuesday-Thursday)\n- **Program:** Full Day - 3 Days (Tuesday-Thursday, 8:30 AM - 3:00 PM)\n- **School Year:** 2025-2026\n\n## Income Qualifications\nThis rate applies to families with household income **less than**:\n- **2-person household:** $34,480\n- **3-person household:** $43,440\n- **4-person household:** $52,400\n- **5-person household:** $61,350\n- **6-person household:** $70,320\n- **7-person household:** $79,280\n- **8+ person household:** $88,240\n\n## What''s Included\n- Complete three-hour morning work cycle\n- Lunch and rest period\n- Afternoon activities and outdoor time\n- All educational materials and supplies\n- Progress assessments and conferences\n- **Extended care at no additional charge** (Tuesday-Thursday until 5:30 PM)\n\n## Extended Care Benefit\nFamilies qualifying for Tuition D receive extended care at no additional cost Tuesday through Thursday from 3:00 PM to 5:30 PM.\n\nThis rate makes our most flexible program option accessible to all families, regardless of financial circumstances. Our three-day option with extended care provides excellent support for working families with limited resources."}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'tuition',
  'tuition-d-full-day-5-days',
  'tuition-d-full-day-5-days',
  '{"type":"rate","rate_label":"Tuition D","program_id":"full-day-5-days","tuition_price":5397,"extended_care_price":0,"extended_care_available":true,"is_constant_rate":false,"school_year":"2025-2026","income_threshold_type":"Less Than","income_threshold_family_2":34480,"income_threshold_family_3":43440,"income_threshold_family_4":52400,"income_threshold_family_5":61350,"income_threshold_family_6":70320,"income_threshold_family_7":79280,"income_threshold_family_8_plus":88240,"display_order":5,"active":true,"body":"# Tuition D - Full Day 5 Days\n\nMaximum tuition assistance for families with the greatest financial need.\n\n## Tuition Rate\n- **Annual Tuition:** $5,397\n- **Extended Care:** Included at no additional cost (available Monday-Thursday)\n- **Program:** Full Day - 5 Days (Monday-Friday, 8:30 AM - 3:00 PM)\n- **School Year:** 2025-2026\n\n## Income Qualifications\nThis rate applies to families with household income **less than**:\n- **2-person household:** $34,480\n- **3-person household:** $43,440\n- **4-person household:** $52,400\n- **5-person household:** $61,350\n- **6-person household:** $70,320\n- **7-person household:** $79,280\n- **8+ person household:** $88,240\n\n## What''s Included\n- Complete three-hour morning work cycle\n- Lunch and rest period\n- Afternoon activities and outdoor time\n- All educational materials and supplies\n- Progress assessments and conferences\n- **Extended care at no additional charge** (Monday-Thursday until 5:30 PM)\n\n## Extended Care Benefit\nFamilies qualifying for Tuition D receive extended care at no additional cost Monday through Thursday from 3:00 PM to 5:30 PM. Friday pickup is at 3:00 PM sharp.\n\nThis rate ensures that financial constraints do not prevent access to quality Montessori education. Our commitment to economic diversity means every child deserves the same exceptional educational experience."}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

-- testimonials collection

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'testimonials',
  'bonnie-h-parent',
  'bonnie-h-parent',
  '{"author":"Bonnie H.","authorTitle":"Parent","rating":5,"featured":true,"date":"2024-02-20T00:00:00.000Z","category":"values","childAge":"5 years old","yearsAtSpicebush":1,"body":"What I love most about Spicebush is how they embrace each child''s uniqueness. The teachers create such a nurturing environment where children feel safe to explore and make mistakes. Our son has flourished here, developing not just academically but emotionally and socially. The focus on peace and community really shows in how the children interact with each other."}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'testimonials',
  'madeleine-s-parent',
  'madeleine-s-parent',
  '{"author":"Madeleine S.","authorTitle":"Parent","rating":5,"featured":true,"date":"2024-01-15T00:00:00.000Z","category":"teachers","childAge":"4 years old","yearsAtSpicebush":2,"body":"Kirsti and Leah are amazing teachers who truly understand each child as an individual. They''ve helped my daughter gain confidence and develop a genuine love for learning. The mixed-age environment has been perfect for her social development, and we''ve seen incredible growth in her independence and problem-solving skills."}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'testimonials',
  'manisha-a-parent',
  'manisha-a-parent',
  '{"author":"Manisha A.","authorTitle":"Parent","rating":5,"featured":true,"date":"2024-03-10T00:00:00.000Z","category":"programs","childAge":"3 years old","yearsAtSpicebush":1,"body":"The Montessori approach at Spicebush has been transformative for our daughter. She''s become so independent and curious about everything around her. The teachers, especially Kira, have such patience and skill in guiding children toward their interests. The hands-on learning materials and the outdoor time have made such a difference in her development. We couldn''t be happier with our choice."}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

-- announcements collection

-- events collection

-- photos collection

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'about-montessori-child-observing-hourglass-time-patience',
  'about-montessori-child-observing-hourglass-time-patience',
  '{"originalFilename":"child-observing-hourglass.png","optimizedFilename":"about-montessori-child-observing-hourglass-time-patience-1200x800.webp","category":"about","originalWidth":1200,"originalHeight":800,"aspectRatio":"3:2","format":"webp","primaryFocalX":40,"primaryFocalY":30,"primaryFocalWeight":10,"primaryFocalDescription":"Child''s eyes intently watching sand fall in hourglass","secondaryFocalX":70,"secondaryFocalY":50,"secondaryFocalWeight":8,"secondaryFocalDescription":"Hourglass with sand flowing, representing time and patience","mobileCropX":20,"mobileCropY":15,"mobileCropWidth":70,"mobileCropHeight":70,"tabletCropX":10,"tabletCropY":10,"tabletCropWidth":85,"tabletCropHeight":80,"altText":"Young child patiently observing sand flowing through hourglass, demonstrating Montessori principles of time awareness and self-paced learning","seoKeywords":["montessori patience","time concept","self-paced learning","hourglass observation","concentration","waiting skills","time awareness"],"contextualDescription":"A child demonstrates patience and focus while observing an hourglass, embodying Montessori''s emphasis on respecting each child''s natural pace of learning","usedOn":["about-philosophy","programs-practical-life"],"primaryUse":"About page philosophy section","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["warm-wood","golden-sand","soft-brown","natural-light"],"lighting":"natural","activity":"time observation","setting":"classroom","priority":false,"body":"# Time and Patience: Hourglass Observation\n\nThis contemplative image captures a fundamental Montessori principle - allowing children to work at their own pace. The child''s patient observation of the hourglass demonstrates the development of time awareness and self-regulation.\n\n## Visual Analysis\n- **Emotional Impact**: Calm, focused, patient demeanor\n- **Educational Content**: Time concepts, patience, observation skills\n- **Composition**: Hourglass and child create visual balance\n- **Symbolism**: Sand flowing represents individual learning pace\n\n## Usage Guidelines\n- **Primary Use**: About page to illustrate self-paced learning philosophy\n- **Secondary Use**: Practical life curriculum section\n- **Focal Point**: Child''s observing eyes show deep engagement\n- **Message**: Reinforces respect for individual development tempo"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'about-montessori-knobbed-cylinders-fine-motor',
  'about-montessori-knobbed-cylinders-fine-motor',
  '{"originalFilename":"knobbed-cylinders.png","optimizedFilename":"about-montessori-knobbed-cylinders-fine-motor-1200x800.webp","category":"about","originalWidth":1200,"originalHeight":800,"aspectRatio":"3:2","format":"webp","primaryFocalX":55,"primaryFocalY":45,"primaryFocalWeight":10,"primaryFocalDescription":"Child''s hand demonstrating perfect pincer grip on cylinder knob","secondaryFocalX":30,"secondaryFocalY":25,"secondaryFocalWeight":8,"secondaryFocalDescription":"Child''s face showing deep concentration during work","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":55,"mobileCropHeight":60,"tabletCropX":15,"tabletCropY":10,"tabletCropWidth":75,"tabletCropHeight":75,"altText":"Child carefully working with Montessori knobbed cylinders, developing fine motor skills and visual discrimination","seoKeywords":["knobbed cylinders","montessori sensorial","fine motor development","pincer grip","visual discrimination","concentration","cylinder blocks"],"contextualDescription":"Classic Montessori material in use as a child refines motor control and visual discrimination through cylinder block work","usedOn":["about-materials","programs-sensorial"],"primaryUse":"About page showcasing authentic Montessori materials","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["natural-wood","soft-pink","warm-beige","gentle-shadows"],"lighting":"natural","activity":"sensorial work","setting":"classroom","priority":false,"compressed":true,"hasWebP":true,"hasSrcSet":true,"lazyLoad":true,"body":"# Precision Work: Knobbed Cylinders\n\nThis image showcases one of Montessori''s most iconic materials - the knobbed cylinders. The child''s careful grip and focused attention demonstrate the material''s role in developing fine motor control and visual discrimination.\n\n## Visual Analysis\n- **Emotional Impact**: Intense focus, careful precision\n- **Educational Content**: Fine motor development, size discrimination, problem-solving\n- **Composition**: Close framing emphasizes hand-material interaction\n- **Symbolism**: Foundation for writing and mathematical thinking\n\n## Usage Guidelines\n- **Primary Use**: About page demonstrating authentic materials\n- **Secondary Use**: Sensorial curriculum explanation\n- **Focal Point**: Precise pincer grip on cylinder knob\n- **Message**: Montessori materials build specific skills systematically"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'about-montessori-mixed-age-collaborative-learning',
  'about-montessori-mixed-age-collaborative-learning',
  '{"originalFilename":"mixed-age-learning.png","optimizedFilename":"about-montessori-mixed-age-collaborative-learning-1200x800.webp","category":"about","originalWidth":1200,"originalHeight":800,"aspectRatio":"3:2","format":"webp","primaryFocalX":45,"primaryFocalY":35,"primaryFocalWeight":10,"primaryFocalDescription":"Older child patiently guiding younger child with materials","secondaryFocalX":55,"secondaryFocalY":55,"secondaryFocalWeight":8,"secondaryFocalDescription":"Hands working together on learning materials","mobileCropX":25,"mobileCropY":15,"mobileCropWidth":60,"mobileCropHeight":65,"tabletCropX":10,"tabletCropY":10,"tabletCropWidth":85,"tabletCropHeight":80,"altText":"Older child mentoring younger student in mixed-age Montessori classroom, demonstrating peer learning and collaboration","seoKeywords":["mixed age classroom","peer learning","montessori collaboration","child mentoring","multi-age education","social development","cooperative learning"],"contextualDescription":"Mixed-age learning in action as an older child naturally takes on the role of mentor, fostering both academic and social growth","usedOn":["about-philosophy","programs-overview"],"primaryUse":"About page mixed-age classroom benefits","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["warm-wood","soft-green","natural-light","earth-tones"],"lighting":"natural","activity":"peer teaching","setting":"classroom","priority":false,"compressed":true,"hasWebP":true,"hasSrcSet":true,"lazyLoad":true,"body":"# Mixed-Age Learning: Natural Mentorship\n\nThis touching image illustrates one of Montessori''s core principles - mixed-age classrooms where children naturally teach and learn from each other. The patience and care shown by the older child exemplifies social development.\n\n## Visual Analysis\n- **Emotional Impact**: Caring, patience, mutual respect\n- **Educational Content**: Peer teaching, collaborative learning, social skills\n- **Composition**: Intimate framing emphasizes connection\n- **Symbolism**: Community learning and natural mentorship\n\n## Usage Guidelines\n- **Primary Use**: About page explaining mixed-age benefits\n- **Secondary Use**: Program overview pages\n- **Focal Point**: The teaching interaction between children\n- **Message**: Children learn from and support each other"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'about-montessori-sound-cylinders-auditory-discrimination',
  'about-montessori-sound-cylinders-auditory-discrimination',
  '{"originalFilename":"sound-cylinders-headphones.png","optimizedFilename":"about-montessori-sound-cylinders-auditory-discrimination-1200x800.webp","category":"about","originalWidth":1200,"originalHeight":800,"aspectRatio":"3:2","format":"webp","primaryFocalX":35,"primaryFocalY":30,"primaryFocalWeight":10,"primaryFocalDescription":"Child''s focused face while listening intently through headphones","secondaryFocalX":65,"secondaryFocalY":60,"secondaryFocalWeight":8,"secondaryFocalDescription":"Montessori sound cylinders arranged for matching exercise","mobileCropX":15,"mobileCropY":10,"mobileCropWidth":60,"mobileCropHeight":65,"tabletCropX":10,"tabletCropY":5,"tabletCropWidth":85,"tabletCropHeight":85,"altText":"Child wearing headphones concentrating deeply while working with Montessori sound cylinders for auditory discrimination","seoKeywords":["montessori sensorial","sound cylinders","auditory discrimination","sensory education","listening skills","concentration","sensorial materials"],"contextualDescription":"A child develops refined auditory discrimination using Montessori sound cylinders, demonstrating deep concentration and sensory refinement","usedOn":["about-sensorial","programs-sensorial"],"primaryUse":"About page sensorial education section","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["warm-wood","soft-blue","natural-beige","muted-red"],"lighting":"indoor","activity":"auditory matching","setting":"classroom","priority":false,"compressed":true,"hasWebP":true,"hasSrcSet":true,"lazyLoad":true,"body":"# Auditory Refinement: Sound Cylinder Work\n\nThis image beautifully captures the concentration required for auditory discrimination work. The use of headphones allows the child to focus completely on subtle sound differences in the cylinders.\n\n## Visual Analysis\n- **Emotional Impact**: Deep concentration, sensory focus\n- **Educational Content**: Auditory discrimination, matching skills, sensorial refinement\n- **Composition**: Child and materials balanced in frame\n- **Symbolism**: Refinement of senses through careful attention\n\n## Usage Guidelines\n- **Primary Use**: About page to illustrate sensorial curriculum\n- **Secondary Use**: Sensorial program detailed description\n- **Focal Point**: Child''s concentrated listening expression\n- **Message**: Montessori develops all senses with precision"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'admissions-montessori-collaborative-art-creative-expression',
  'admissions-montessori-collaborative-art-creative-expression',
  '{"originalFilename":"collaborative-art-project.png","optimizedFilename":"admissions-montessori-collaborative-art-creative-expression-1200x800.webp","category":"admissions","originalWidth":1200,"originalHeight":800,"aspectRatio":"3:2","format":"webp","primaryFocalX":50,"primaryFocalY":40,"primaryFocalWeight":10,"primaryFocalDescription":"Multiple children collaborating on large art project","secondaryFocalX":45,"secondaryFocalY":60,"secondaryFocalWeight":8,"secondaryFocalDescription":"Vibrant collaborative artwork taking shape","mobileCropX":30,"mobileCropY":25,"mobileCropWidth":55,"mobileCropHeight":60,"tabletCropX":15,"tabletCropY":15,"tabletCropWidth":80,"tabletCropHeight":75,"altText":"Group of children working together on collaborative art project, showcasing creativity and teamwork in Montessori environment","seoKeywords":["collaborative learning","montessori art","creative expression","teamwork","group project","social skills","artistic development"],"contextualDescription":"Collaborative art projects foster creativity, communication, and community spirit among mixed-age students","usedOn":["admissions-community","programs-art"],"primaryUse":"Admissions page showcasing community aspect","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":false,"dominantColors":["bright-blue","vibrant-yellow","energetic-red","creative-purple"],"lighting":"natural","activity":"collaborative art","setting":"classroom","priority":false,"compressed":true,"hasWebP":true,"hasSrcSet":true,"lazyLoad":true,"body":"# Community Creation: Collaborative Art\n\nThis image beautifully captures the collaborative spirit of Spicebush Montessori. Children work together on a shared artistic vision, developing both creative and social skills.\n\n## Visual Analysis\n- **Emotional Impact**: Joy, cooperation, creative energy\n- **Educational Content**: Teamwork, artistic expression, communication\n- **Composition**: Multiple perspectives working toward common goal\n- **Symbolism**: Community building through shared creativity\n\n## Usage Guidelines\n- **Primary Use**: Admissions page highlighting community values\n- **Secondary Use**: Arts program overview\n- **Focal Point**: Children''s engaged collaboration\n- **Message**: Learning happens best in community"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'admissions-montessori-group-block-construction-teamwork',
  'admissions-montessori-group-block-construction-teamwork',
  '{"originalFilename":"group-block-work.png","optimizedFilename":"admissions-montessori-group-block-construction-teamwork-1200x800.webp","category":"admissions","originalWidth":1200,"originalHeight":800,"aspectRatio":"3:2","format":"webp","primaryFocalX":45,"primaryFocalY":40,"primaryFocalWeight":10,"primaryFocalDescription":"Group of children working together on block construction","secondaryFocalX":60,"secondaryFocalY":55,"secondaryFocalWeight":8,"secondaryFocalDescription":"Complex block structure showing collaborative achievement","mobileCropX":25,"mobileCropY":20,"mobileCropWidth":60,"mobileCropHeight":65,"tabletCropX":15,"tabletCropY":10,"tabletCropWidth":80,"tabletCropHeight":80,"altText":"Mixed-age group collaborating on complex block construction, demonstrating teamwork and engineering skills in Montessori environment","seoKeywords":["block construction","teamwork","collaborative building","STEM learning","spatial reasoning","group work","problem solving"],"contextualDescription":"Block construction activities develop spatial reasoning, planning, and collaboration skills through hands-on engineering challenges","usedOn":["admissions-collaboration","programs-construction"],"primaryUse":"Admissions showcasing collaborative learning","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["natural-wood","bright-blocks","focused-lighting","warm-tones"],"lighting":"indoor","activity":"collaborative construction","setting":"classroom","priority":false,"compressed":true,"hasWebP":true,"hasSrcSet":true,"lazyLoad":true,"body":"# Engineering Together: Block Construction\n\nThis image captures the essence of collaborative learning as children work together on an ambitious block construction. The focus and teamwork displayed shows how Montessori fosters both individual and group achievement.\n\n## Visual Analysis\n- **Emotional Impact**: Concentration, cooperation, pride in achievement\n- **Educational Content**: Engineering concepts, spatial reasoning, teamwork\n- **Composition**: Multiple perspectives working on shared goal\n- **Symbolism**: Building knowledge through collaboration\n\n## Usage Guidelines\n- **Primary Use**: Admissions page collaboration section\n- **Secondary Use**: STEM and construction activities\n- **Focal Point**: Children''s engaged teamwork\n- **Message**: Complex learning happens through cooperation"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'admissions-montessori-reading-together-literacy-community',
  'admissions-montessori-reading-together-literacy-community',
  '{"originalFilename":"reading-together.png","optimizedFilename":"admissions-montessori-reading-together-literacy-community-1200x800.webp","category":"admissions","originalWidth":1200,"originalHeight":800,"aspectRatio":"3:2","format":"webp","primaryFocalX":45,"primaryFocalY":35,"primaryFocalWeight":10,"primaryFocalDescription":"Children leaning in together to read a shared book","secondaryFocalX":55,"secondaryFocalY":55,"secondaryFocalWeight":8,"secondaryFocalDescription":"Open book showing engaging illustrations and text","mobileCropX":25,"mobileCropY":20,"mobileCropWidth":60,"mobileCropHeight":65,"tabletCropX":15,"tabletCropY":10,"tabletCropWidth":80,"tabletCropHeight":80,"altText":"Small group of children reading together in cozy Montessori classroom corner, fostering literacy and community bonds","seoKeywords":["reading together","literacy development","montessori reading","peer learning","shared reading","language arts","community learning"],"contextualDescription":"Shared reading experiences build literacy skills while strengthening social bonds and creating a love of learning","usedOn":["admissions-literacy","programs-language"],"primaryUse":"Admissions page showcasing literacy approach","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":false,"dominantColors":["warm-wood","soft-blue","book-colors","cozy-lighting"],"lighting":"indoor","activity":"shared reading","setting":"classroom","priority":false,"compressed":true,"hasWebP":true,"hasSrcSet":true,"lazyLoad":true,"body":"# Literacy in Community: Reading Together\n\nThis intimate scene shows how literacy develops naturally in a Montessori environment through peer interaction and shared exploration of books. The cozy setting encourages a love of reading.\n\n## Visual Analysis\n- **Emotional Impact**: Warmth, engagement, shared discovery\n- **Educational Content**: Peer reading, literacy skills, social learning\n- **Composition**: Intimate grouping focused on shared text\n- **Symbolism**: Learning as a social, joyful experience\n\n## Usage Guidelines\n- **Primary Use**: Admissions page literacy section\n- **Secondary Use**: Language arts program details\n- **Focal Point**: Children''s engaged expressions while reading\n- **Message**: Literacy develops through community and joy"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'admissions-montessori-winter-playground-outdoor-joy',
  'admissions-montessori-winter-playground-outdoor-joy',
  '{"originalFilename":"winter-playground-joy.png","optimizedFilename":"admissions-montessori-winter-playground-outdoor-joy-1200x800.webp","category":"admissions","originalWidth":1200,"originalHeight":800,"aspectRatio":"3:2","format":"webp","primaryFocalX":50,"primaryFocalY":35,"primaryFocalWeight":10,"primaryFocalDescription":"Children playing joyfully in winter playground setting","secondaryFocalX":30,"secondaryFocalY":50,"secondaryFocalWeight":8,"secondaryFocalDescription":"Natural playground elements covered in fresh snow","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":55,"mobileCropHeight":60,"tabletCropX":15,"tabletCropY":10,"tabletCropWidth":80,"tabletCropHeight":80,"altText":"Children enjoying outdoor winter play on natural playground, demonstrating year-round outdoor education at Montessori school","seoKeywords":["outdoor education","winter play","natural playground","year-round learning","outdoor classroom","active play","nature-based"],"contextualDescription":"Year-round outdoor play supports physical development and connection with nature in all seasons","usedOn":["admissions-outdoor","programs-movement"],"primaryUse":"Admissions showcasing outdoor program","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":false,"dominantColors":["winter-white","bright-jackets","natural-wood","crisp-blue"],"lighting":"natural","activity":"outdoor play","setting":"outdoor","priority":false,"compressed":true,"hasWebP":true,"hasSrcSet":true,"lazyLoad":true,"body":"# All-Season Learning: Winter Playground Joy\n\nThis energetic image demonstrates Spicebush''s commitment to outdoor education in all seasons. Children''s joy in winter play shows how nature remains central to learning year-round.\n\n## Visual Analysis\n- **Emotional Impact**: Pure joy, freedom, winter excitement\n- **Educational Content**: Gross motor development, seasonal adaptation, risk-taking\n- **Composition**: Dynamic movement against winter landscape\n- **Symbolism**: Learning continues in all conditions\n\n## Usage Guidelines\n- **Primary Use**: Admissions page outdoor education section\n- **Secondary Use**: Movement and physical development\n- **Focal Point**: Children''s expressions of winter joy\n- **Message**: Outdoor learning happens in every season"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'art-montessori-art-img-5458-1306x1741',
  'art-montessori-art-img-5458-1306x1741',
  '{"originalFilename":"IMG_5458.png","optimizedFilename":"art-montessori-art-img-5458-1306x1741.webp","category":"art","originalWidth":1306,"originalHeight":1741,"aspectRatio":"3:4","format":"webp","primaryFocalX":50,"primaryFocalY":40,"primaryFocalWeight":10,"primaryFocalDescription":"Creative work in the art area","secondaryFocalX":35,"secondaryFocalY":55,"secondaryFocalWeight":8,"secondaryFocalDescription":"Detailed artistic creation","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Creative work in the art area at Spicebush Montessori School","seoKeywords":["art","creativity","painting","artistic expression","creative"],"contextualDescription":"Creative work in the art area","usedOn":[],"primaryUse":"Creative arts program","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":false,"dominantColors":["creative-detail","art-focus","expressive-work"],"lighting":"natural","activity":"detailed art creation","setting":"art area","season":"winter","quality":"medium","isRecent":false,"priority":false,"body":"# Detailed Creative Work\n\nThis final art category image showcases the attention to detail children bring to their creative work, demonstrating the concentration and care fostered through artistic expression.\n\n## Visual Analysis\n- **Emotional Impact**: Careful creation, artistic pride\n- **Educational Content**: Fine motor development through art\n- **Composition**: Vertical view of detailed work\n- **Process**: Careful, concentrated artistic creation\n\n## Usage Guidelines\n- **Primary Use**: Art as fine motor development\n- **Secondary Use**: Concentration through creativity\n- **Focal Point**: Child''s careful artistic work\n- **Message**: Art develops multiple skills simultaneously"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'art-montessori-art-img-5469-1872x1404',
  'art-montessori-art-img-5469-1872x1404',
  '{"originalFilename":"IMG_5469.png","optimizedFilename":"art-montessori-art-img-5469-1872x1404.webp","category":"art","originalWidth":1872,"originalHeight":1404,"aspectRatio":"4:3","format":"webp","primaryFocalX":55,"primaryFocalY":45,"primaryFocalWeight":10,"primaryFocalDescription":"Creative expression through art activities","secondaryFocalX":30,"secondaryFocalY":40,"secondaryFocalWeight":8,"secondaryFocalDescription":"Artistic process and materials","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Creative expression through art activities at Spicebush Montessori School","seoKeywords":["art","creativity","painting","artistic expression","creative"],"contextualDescription":"Creative expression through art activities","usedOn":[],"primaryUse":"Art exploration documentation","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":false,"dominantColors":["creative-exploration","art-process","colorful-materials"],"lighting":"natural","activity":"artistic exploration","setting":"art area","season":"winter","quality":"medium","isRecent":false,"priority":false,"body":"# Artistic Process Exploration\n\nThis horizontal image captures the exploratory nature of art education, showing children discovering various artistic techniques and materials.\n\n## Visual Analysis\n- **Emotional Impact**: Discovery, experimentation, creative process\n- **Educational Content**: Process-focused art education\n- **Composition**: Wide view of artistic exploration\n- **Materials**: Various art media and techniques\n\n## Usage Guidelines\n- **Primary Use**: Art process over product philosophy\n- **Secondary Use**: Experimental art approaches\n- **Focal Point**: Children exploring art techniques\n- **Message**: Emphasizes process-based art learning"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'art-montessori-art-img-5526-1563x1827',
  'art-montessori-art-img-5526-1563x1827',
  '{"originalFilename":"IMG_5526.png","optimizedFilename":"art-montessori-art-img-5526-1563x1827.webp","category":"art","originalWidth":1563,"originalHeight":1827,"aspectRatio":"6:7","format":"webp","primaryFocalX":45,"primaryFocalY":35,"primaryFocalWeight":10,"primaryFocalDescription":"Creative expression through art activities","secondaryFocalX":60,"secondaryFocalY":50,"secondaryFocalWeight":8,"secondaryFocalDescription":"Engaged artistic creation","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Creative expression through art activities at Spicebush Montessori School","seoKeywords":["art","creativity","painting","artistic expression","creative"],"contextualDescription":"Creative expression through art activities","usedOn":[],"primaryUse":"Art activities program","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":false,"dominantColors":["creative-activity","art-engagement","expressive-colors"],"lighting":"natural","activity":"art activities","setting":"art area","season":"winter","quality":"medium","isRecent":false,"priority":false,"body":"# Creative Art Activities\n\nThis image beautifully captures children immersed in creative art activities, demonstrating the role of artistic expression in developing the whole child.\n\n## Visual Analysis\n- **Emotional Impact**: Creative engagement, artistic joy\n- **Educational Content**: Multi-sensory art experiences\n- **Composition**: Vertical format showing art process\n- **Activity**: Hands-on creative exploration\n\n## Usage Guidelines\n- **Primary Use**: Art curriculum activities\n- **Secondary Use**: Creative development benefits\n- **Focal Point**: Children actively creating art\n- **Message**: Art as integral to development"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'art-montessori-art-img-5739-1363x1783',
  'art-montessori-art-img-5739-1363x1783',
  '{"originalFilename":"IMG_5739.png","optimizedFilename":"art-montessori-art-img-5739-1363x1783.webp","category":"art","originalWidth":1363,"originalHeight":1783,"aspectRatio":"4:5","format":"webp","primaryFocalX":55,"primaryFocalY":45,"primaryFocalWeight":10,"primaryFocalDescription":"Creative work in the art area","secondaryFocalX":30,"secondaryFocalY":40,"secondaryFocalWeight":8,"secondaryFocalDescription":"Hands-on artistic process","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Creative work in the art area at Spicebush Montessori School","seoKeywords":["art","creativity","painting","artistic expression","creative"],"contextualDescription":"Creative work in the art area","usedOn":[],"primaryUse":"Creative expression showcase","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":false,"dominantColors":["creative-expression","art-materials","vibrant-colors"],"lighting":"natural","activity":"artistic expression","setting":"art area","season":"winter","quality":"medium","isRecent":false,"priority":false,"body":"# Artistic Expression Freedom\n\nThis lively image captures the freedom of artistic expression, showing children fully engaged in creative work with various art materials.\n\n## Visual Analysis\n- **Emotional Impact**: Creative freedom, joyful expression\n- **Educational Content**: Self-expression through art\n- **Composition**: Vertical view of artistic engagement\n- **Materials**: Diverse art supplies enabling expression\n\n## Usage Guidelines\n- **Primary Use**: Creative freedom documentation\n- **Secondary Use**: Art program philosophy\n- **Focal Point**: Children''s free artistic expression\n- **Message**: Art as vehicle for self-expression"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'art-montessori-art-img-5922-1508x1741',
  'art-montessori-art-img-5922-1508x1741',
  '{"originalFilename":"IMG_5922.png","optimizedFilename":"art-montessori-art-img-5922-1508x1741.webp","category":"art","originalWidth":1508,"originalHeight":1741,"aspectRatio":"7:8","format":"webp","primaryFocalX":45,"primaryFocalY":35,"primaryFocalWeight":10,"primaryFocalDescription":"Creative work in the art area","secondaryFocalX":60,"secondaryFocalY":50,"secondaryFocalWeight":8,"secondaryFocalDescription":"Art materials and creation","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Creative work in the art area at Spicebush Montessori School","seoKeywords":["art","creativity","painting","artistic expression","creative"],"contextualDescription":"Creative work in the art area","usedOn":[],"primaryUse":"Art activities documentation","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":false,"dominantColors":["art-creation","creative-space","colorful-work"],"lighting":"natural","activity":"art creation","setting":"art area","season":"winter","quality":"medium","isRecent":false,"priority":false,"body":"# Creative Art Activities\n\nThis warm image showcases children engaged in creative art activities, highlighting the importance of artistic expression in holistic education.\n\n## Visual Analysis\n- **Emotional Impact**: Creative joy, artistic engagement\n- **Educational Content**: Fine motor skills through art\n- **Composition**: Nearly square format of art activity\n- **Process**: Hands-on creative exploration\n\n## Usage Guidelines\n- **Primary Use**: Art activity examples\n- **Secondary Use**: Creative curriculum showcase\n- **Focal Point**: Active art creation process\n- **Message**: Art as essential learning component"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'art-montessori-art-img-5980-1578x2104',
  'art-montessori-art-img-5980-1578x2104',
  '{"originalFilename":"IMG_5980.png","optimizedFilename":"art-montessori-art-img-5980-1578x2104.webp","category":"art","originalWidth":1578,"originalHeight":2104,"aspectRatio":"3:4","format":"webp","primaryFocalX":50,"primaryFocalY":40,"primaryFocalWeight":10,"primaryFocalDescription":"Creative work in the art area","secondaryFocalX":35,"secondaryFocalY":55,"secondaryFocalWeight":8,"secondaryFocalDescription":"Concentrated artistic creation","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Creative work in the art area at Spicebush Montessori School","seoKeywords":["art","creativity","painting","artistic expression","creative"],"contextualDescription":"Creative work in the art area","usedOn":[],"primaryUse":"Creative process showcase","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":false,"dominantColors":["creative-colors","art-supplies","expressive-work"],"lighting":"natural","activity":"artistic creation","setting":"art area","season":"winter","quality":"medium","isRecent":false,"priority":false,"body":"# Focused Creative Work\n\nThis image captures a child deeply engaged in creative work, showing the concentration and care that artistic expression naturally inspires.\n\n## Visual Analysis\n- **Emotional Impact**: Creative focus, artistic absorption\n- **Educational Content**: Art as concentration builder\n- **Composition**: Vertical emphasis on creative process\n- **Expression**: Deep engagement with artistic work\n\n## Usage Guidelines\n- **Primary Use**: Art concentration benefits\n- **Secondary Use**: Creative development process\n- **Focal Point**: Child''s focused artistic work\n- **Message**: Art as vehicle for concentration"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'art-montessori-art-img-6382-1429x1909',
  'art-montessori-art-img-6382-1429x1909',
  '{"originalFilename":"IMG_6382.png","optimizedFilename":"art-montessori-art-img-6382-1429x1909.webp","category":"art","originalWidth":1429,"originalHeight":1909,"aspectRatio":"3:4","format":"webp","primaryFocalX":55,"primaryFocalY":45,"primaryFocalWeight":10,"primaryFocalDescription":"Students exploring artistic materials","secondaryFocalX":30,"secondaryFocalY":40,"secondaryFocalWeight":8,"secondaryFocalDescription":"Hands-on artistic exploration","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Students exploring artistic materials at Spicebush Montessori School","seoKeywords":["art","creativity","painting","artistic expression","creative"],"contextualDescription":"Students exploring artistic materials","usedOn":[],"primaryUse":"Artistic exploration section","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":false,"dominantColors":["art-materials","creative-exploration","colorful-expression"],"lighting":"natural","activity":"artistic exploration","setting":"art area","season":"winter","quality":"medium","isRecent":false,"priority":false,"body":"# Artistic Material Exploration\n\nThis engaging image shows students exploring various artistic materials, demonstrating the hands-on approach to creative development at Spicebush Montessori.\n\n## Visual Analysis\n- **Emotional Impact**: Discovery, experimentation, creative freedom\n- **Educational Content**: Material exploration, artistic techniques\n- **Composition**: Vertical format showing material variety\n- **Process**: Children discovering artistic possibilities\n\n## Usage Guidelines\n- **Primary Use**: Art material exploration pages\n- **Secondary Use**: Creative process documentation\n- **Focal Point**: Students'' hands-on material exploration\n- **Message**: Shows artistic discovery process"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'art-montessori-art-img-6858-1482x1976',
  'art-montessori-art-img-6858-1482x1976',
  '{"originalFilename":"IMG_6858.png","optimizedFilename":"art-montessori-art-img-6858-1482x1976.webp","category":"art","originalWidth":1482,"originalHeight":1976,"aspectRatio":"3:4","format":"webp","primaryFocalX":50,"primaryFocalY":40,"primaryFocalWeight":10,"primaryFocalDescription":"Creative work in the art area","secondaryFocalX":35,"secondaryFocalY":55,"secondaryFocalWeight":8,"secondaryFocalDescription":"Artistic materials and creation","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Creative work in the art area at Spicebush Montessori School","seoKeywords":["art","creativity","painting","artistic expression","creative"],"contextualDescription":"Creative work in the art area","usedOn":[],"primaryUse":"Art curriculum showcase","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":false,"dominantColors":["artistic-colors","creative-materials","bright-expression"],"lighting":"natural","activity":"artistic creation","setting":"art area","season":"winter","quality":"medium","isRecent":false,"priority":false,"body":"# Creative Art Expression\n\nThis vibrant image captures the joy of artistic creation in the art area, where children freely express themselves through various creative mediums.\n\n## Visual Analysis\n- **Emotional Impact**: Creative joy, self-expression, freedom\n- **Educational Content**: Artistic development, creativity\n- **Composition**: Vertical view of art creation process\n- **Materials**: Various art supplies and creative tools\n\n## Usage Guidelines\n- **Primary Use**: Art program documentation\n- **Secondary Use**: Creative expression examples\n- **Focal Point**: Child engaged in artistic creation\n- **Message**: Emphasizes creative development importance"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'classroom-montessori-classroom-img-7150-1617x1213',
  'classroom-montessori-classroom-img-7150-1617x1213',
  '{"originalFilename":"IMG_7150.png","optimizedFilename":"classroom-montessori-classroom-img-7150-1617x1213.webp","category":"classroom","originalWidth":1617,"originalHeight":1213,"aspectRatio":"4:3","format":"webp","primaryFocalX":40,"primaryFocalY":35,"primaryFocalWeight":10,"primaryFocalDescription":"Peaceful classroom atmosphere during work time","secondaryFocalX":60,"secondaryFocalY":50,"secondaryFocalWeight":8,"secondaryFocalDescription":"Defined learning areas","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Peaceful classroom atmosphere during work time at Spicebush Montessori School","seoKeywords":["classroom","montessori environment","learning","concentration","materials"],"contextualDescription":"Peaceful classroom atmosphere during work time","usedOn":[],"primaryUse":"Work cycle documentation","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["soft-classroom","gentle-light","warm-atmosphere"],"lighting":"natural","activity":"independent work","setting":"montessori classroom","season":"spring","quality":"medium","isRecent":false,"priority":false,"body":"# Focused Work Time\n\nThis tranquil image captures the essence of the Montessori work cycle, showing children deeply engaged in their chosen activities within a peaceful classroom setting.\n\n## Visual Analysis\n- **Emotional Impact**: Concentration, peace, purposeful activity\n- **Educational Content**: Independent learning, work cycle\n- **Composition**: Horizontal view showing multiple work areas\n- **Atmosphere**: Calm, productive learning environment\n\n## Usage Guidelines\n- **Primary Use**: Work cycle and concentration pages\n- **Secondary Use**: Classroom atmosphere documentation\n- **Focal Point**: Children absorbed in their work\n- **Message**: Illustrates deep concentration and engagement"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'classroom-montessori-classroom-img-8530-1322x1762',
  'classroom-montessori-classroom-img-8530-1322x1762',
  '{"originalFilename":"IMG_8530.png","optimizedFilename":"classroom-montessori-classroom-img-8530-1322x1762.webp","category":"classroom","originalWidth":1322,"originalHeight":1762,"aspectRatio":"3:4","format":"webp","primaryFocalX":50,"primaryFocalY":40,"primaryFocalWeight":10,"primaryFocalDescription":"Montessori classroom with prepared materials","secondaryFocalX":30,"secondaryFocalY":30,"secondaryFocalWeight":8,"secondaryFocalDescription":"Organized learning materials","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Montessori classroom environment with prepared materials at Spicebush Montessori School","seoKeywords":["classroom","montessori environment","learning","concentration","materials"],"contextualDescription":"Montessori classroom environment with prepared materials","usedOn":[],"primaryUse":"Prepared environment showcase","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["organized-shelves","natural-materials","calm-tones"],"lighting":"natural","activity":"environment preparation","setting":"montessori classroom","season":"spring","quality":"medium","isRecent":true,"priority":false,"body":"# Prepared Montessori Environment\n\nThis image showcases the carefully prepared Montessori classroom environment, where every material has its place and purpose in supporting independent learning.\n\n## Visual Analysis\n- **Emotional Impact**: Order, beauty, accessibility\n- **Educational Content**: Material organization, environmental preparation\n- **Composition**: Clear view of organized learning spaces\n- **Design**: Thoughtful arrangement of Montessori materials\n\n## Usage Guidelines\n- **Primary Use**: Prepared environment explanation\n- **Secondary Use**: Classroom setup and organization\n- **Focal Point**: Organized, accessible materials\n- **Message**: Demonstrates intentional environmental design"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'classroom-montessori-classroom-img-8743-1731x1055',
  'classroom-montessori-classroom-img-8743-1731x1055',
  '{"originalFilename":"IMG_8743.png","optimizedFilename":"classroom-montessori-classroom-img-8743-1731x1055.webp","category":"classroom","originalWidth":1731,"originalHeight":1055,"aspectRatio":"16:10","format":"webp","primaryFocalX":40,"primaryFocalY":35,"primaryFocalWeight":10,"primaryFocalDescription":"Mixed-age classroom collaboration","secondaryFocalX":60,"secondaryFocalY":50,"secondaryFocalWeight":8,"secondaryFocalDescription":"Classroom environment and materials","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Mixed-age classroom collaboration at Spicebush Montessori School","seoKeywords":["classroom","montessori environment","learning","concentration","materials"],"contextualDescription":"Mixed-age classroom collaboration","usedOn":[],"primaryUse":"Classroom dynamics showcase","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["bright-classroom","natural-light","learning-colors"],"lighting":"natural","activity":"group learning","setting":"montessori classroom","season":"spring","quality":"medium","isRecent":true,"priority":false,"body":"# Dynamic Classroom Environment\n\nThis wide-angle view captures the dynamic nature of a Montessori classroom, showing multiple learning activities happening simultaneously in the prepared environment.\n\n## Visual Analysis\n- **Emotional Impact**: Bustling productivity, engaged learning\n- **Educational Content**: Multiple learning areas, choice\n- **Composition**: Panoramic view of classroom activity\n- **Space**: Well-utilized learning environment\n\n## Usage Guidelines\n- **Primary Use**: Classroom overview and layout\n- **Secondary Use**: Learning environment description\n- **Focal Point**: Overall classroom dynamics\n- **Message**: Shows active, multi-faceted learning space"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'classroom-montessori-classroom-img-8832-1497x1296',
  'classroom-montessori-classroom-img-8832-1497x1296',
  '{"originalFilename":"IMG_8832.png","optimizedFilename":"classroom-montessori-classroom-img-8832-1497x1296.webp","category":"classroom","originalWidth":1497,"originalHeight":1296,"aspectRatio":"19:16","format":"webp","primaryFocalX":45,"primaryFocalY":45,"primaryFocalWeight":10,"primaryFocalDescription":"Mixed-age classroom collaboration","secondaryFocalX":65,"secondaryFocalY":35,"secondaryFocalWeight":8,"secondaryFocalDescription":"Montessori materials in use","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Mixed-age classroom collaboration at Spicebush Montessori School","seoKeywords":["classroom","montessori environment","learning","concentration","materials"],"contextualDescription":"Mixed-age classroom collaboration","usedOn":[],"primaryUse":"Collaborative learning showcase","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["classroom-tones","natural-light","warm-wood"],"lighting":"natural","activity":"collaborative work","setting":"montessori classroom","season":"spring","quality":"medium","isRecent":true,"priority":false,"body":"# Collaborative Classroom Learning\n\nThis dynamic image showcases the collaborative nature of Montessori education, with students working together in a carefully prepared classroom environment.\n\n## Visual Analysis\n- **Emotional Impact**: Cooperation, engagement, shared learning\n- **Educational Content**: Peer teaching, collaborative skills\n- **Composition**: Multiple students engaged together\n- **Materials**: Montessori materials facilitating group work\n\n## Usage Guidelines\n- **Primary Use**: Collaboration and peer learning sections\n- **Secondary Use**: Classroom community showcase\n- **Focal Point**: Students working together with materials\n- **Message**: Emphasizes social learning aspects"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'classroom-montessori-classroom-img-9413-1554x2072',
  'classroom-montessori-classroom-img-9413-1554x2072',
  '{"originalFilename":"IMG_9413.png","optimizedFilename":"classroom-montessori-classroom-img-9413-1554x2072.webp","category":"classroom","originalWidth":1554,"originalHeight":2072,"aspectRatio":"3:4","format":"webp","primaryFocalX":40,"primaryFocalY":35,"primaryFocalWeight":10,"primaryFocalDescription":"Peaceful classroom atmosphere during work time","secondaryFocalX":60,"secondaryFocalY":50,"secondaryFocalWeight":8,"secondaryFocalDescription":"Organized materials and workspace","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Peaceful classroom atmosphere during work time at Spicebush Montessori School","seoKeywords":["classroom","montessori environment","learning","concentration","materials"],"contextualDescription":"Peaceful classroom atmosphere during work time","usedOn":[],"primaryUse":"Classroom environment pages","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["calm-neutrals","soft-light","natural-wood"],"lighting":"natural","activity":"focused work time","setting":"montessori classroom","season":"fall","quality":"medium","isRecent":true,"priority":false,"body":"# Peaceful Classroom Atmosphere\n\nThis serene image captures the calm, focused atmosphere of a Montessori work period, where children engage deeply with their chosen activities in a prepared environment.\n\n## Visual Analysis\n- **Emotional Impact**: Tranquility, focus, purposeful activity\n- **Educational Content**: Independent work, concentration\n- **Composition**: Balanced view of active classroom\n- **Atmosphere**: Calm and productive learning environment\n\n## Usage Guidelines\n- **Primary Use**: Classroom atmosphere description\n- **Secondary Use**: Work cycle explanation\n- **Focal Point**: Overall peaceful classroom ambiance\n- **Message**: Demonstrates normalized, calm learning environment"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'classroom-montessori-classroom-img-9831-1442x1922',
  'classroom-montessori-classroom-img-9831-1442x1922',
  '{"originalFilename":"IMG_9831.png","optimizedFilename":"classroom-montessori-classroom-img-9831-1442x1922.webp","category":"classroom","originalWidth":1442,"originalHeight":1922,"aspectRatio":"3:4","format":"webp","primaryFocalX":50,"primaryFocalY":40,"primaryFocalWeight":10,"primaryFocalDescription":"Mixed-age classroom collaboration","secondaryFocalX":30,"secondaryFocalY":30,"secondaryFocalWeight":8,"secondaryFocalDescription":"Prepared classroom environment","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Mixed-age classroom collaboration at Spicebush Montessori School","seoKeywords":["classroom","montessori environment","learning","concentration","materials"],"contextualDescription":"Mixed-age classroom collaboration","usedOn":[],"primaryUse":"Classroom environment showcase","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["classroom-wood","natural-light","warm-tones"],"lighting":"natural","activity":"collaborative learning","setting":"montessori classroom","season":"fall","quality":"medium","isRecent":true,"priority":false,"body":"# Mixed-Age Classroom Collaboration\n\nThis image beautifully captures the essence of mixed-age learning at Spicebush Montessori, where older and younger students work together in a prepared environment.\n\n## Visual Analysis\n- **Emotional Impact**: Community, mentorship, collaborative spirit\n- **Educational Content**: Peer learning, mixed-age benefits\n- **Composition**: Natural grouping showing age diversity\n- **Environment**: Well-organized Montessori classroom\n\n## Usage Guidelines\n- **Primary Use**: Mixed-age classroom benefits section\n- **Secondary Use**: Collaborative learning showcase\n- **Focal Point**: Students of different ages working together\n- **Message**: Highlights unique Montessori multi-age approach"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'events-montessori-celebration-img-3040-1640x2187',
  'events-montessori-celebration-img-3040-1640x2187',
  '{"originalFilename":"IMG_3040.png","optimizedFilename":"events-montessori-celebration-img-3040-1640x2187.webp","category":"events","originalWidth":1640,"originalHeight":2187,"aspectRatio":"3:4","format":"webp","primaryFocalX":55,"primaryFocalY":45,"primaryFocalWeight":10,"primaryFocalDescription":"School community gathering","secondaryFocalX":30,"secondaryFocalY":40,"secondaryFocalWeight":8,"secondaryFocalDescription":"Vibrant celebration atmosphere","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"School community gathering at Spicebush Montessori School","seoKeywords":["celebration","community","events","gathering","special occasion"],"contextualDescription":"School community gathering","usedOn":[],"primaryUse":"Community celebration finale","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":false,"dominantColors":["community-celebration","gathering-energy","festive-finale"],"lighting":"natural","activity":"community celebration","setting":"school event","season":"various","quality":"medium","isRecent":false,"priority":false,"body":"# Vibrant Community Celebration\n\nThis final events image captures the energy and vibrancy of school community gatherings, showcasing the joyful atmosphere that characterizes Spicebush Montessori celebrations.\n\n## Visual Analysis\n- **Emotional Impact**: Community energy, collective joy, belonging\n- **Educational Content**: Community participation, celebration skills\n- **Composition**: Vertical view capturing celebration energy\n- **Atmosphere**: Dynamic, inclusive community event\n\n## Usage Guidelines\n- **Primary Use**: Community celebration highlights\n- **Secondary Use**: School culture representation\n- **Focal Point**: Vibrant community gathering\n- **Message**: Joyful, inclusive school community"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'events-montessori-celebration-img-3100-1754x1341',
  'events-montessori-celebration-img-3100-1754x1341',
  '{"originalFilename":"IMG_3100.png","optimizedFilename":"events-montessori-celebration-img-3100-1754x1341.webp","category":"events","originalWidth":1754,"originalHeight":1341,"aspectRatio":"4:3","format":"webp","primaryFocalX":45,"primaryFocalY":35,"primaryFocalWeight":10,"primaryFocalDescription":"Seasonal celebration with students","secondaryFocalX":60,"secondaryFocalY":50,"secondaryFocalWeight":8,"secondaryFocalDescription":"Celebration activities and traditions","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Seasonal celebration with students at Spicebush Montessori School","seoKeywords":["celebration","community","events","gathering","special occasion"],"contextualDescription":"Seasonal celebration with students","usedOn":[],"primaryUse":"Seasonal traditions showcase","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":false,"dominantColors":["seasonal-celebration","traditional-activities","festive-atmosphere"],"lighting":"natural","activity":"seasonal traditions","setting":"school event","season":"various","quality":"medium","isRecent":false,"priority":false,"body":"# Seasonal School Traditions\n\nThis horizontal image showcases seasonal celebration traditions, demonstrating how recurring events create anticipation and community rhythm throughout the school year.\n\n## Visual Analysis\n- **Emotional Impact**: Tradition, anticipation, seasonal joy\n- **Educational Content**: Cultural traditions, seasonal awareness\n- **Composition**: Wide view of traditional activities\n- **Traditions**: Established celebration patterns\n\n## Usage Guidelines\n- **Primary Use**: School traditions documentation\n- **Secondary Use**: Annual events showcase\n- **Focal Point**: Traditional celebration activities\n- **Message**: Rich tradition of celebrations"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'events-montessori-celebration-img-3416-1626x2168',
  'events-montessori-celebration-img-3416-1626x2168',
  '{"originalFilename":"IMG_3416.png","optimizedFilename":"events-montessori-celebration-img-3416-1626x2168.webp","category":"events","originalWidth":1626,"originalHeight":2168,"aspectRatio":"3:4","format":"webp","primaryFocalX":50,"primaryFocalY":40,"primaryFocalWeight":10,"primaryFocalDescription":"Special event bringing families together","secondaryFocalX":35,"secondaryFocalY":55,"secondaryFocalWeight":8,"secondaryFocalDescription":"Family and community connections","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Special event bringing families together at Spicebush Montessori School","seoKeywords":["celebration","community","events","gathering","special occasion"],"contextualDescription":"Special event bringing families together","usedOn":[],"primaryUse":"Family events documentation","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":false,"dominantColors":["family-gathering","warm-atmosphere","community-connection"],"lighting":"natural","activity":"family event","setting":"school gathering","season":"various","quality":"medium","isRecent":false,"priority":false,"body":"# Family Community Event\n\nThis image captures a special event that brings families together, demonstrating how Spicebush Montessori extends its community beyond the classroom.\n\n## Visual Analysis\n- **Emotional Impact**: Family connection, community extension\n- **Educational Content**: Family involvement, community building\n- **Composition**: Vertical format of family gathering\n- **Connection**: School-family partnership visible\n\n## Usage Guidelines\n- **Primary Use**: Family involvement pages\n- **Secondary Use**: Community partnership showcase\n- **Focal Point**: Families participating in school event\n- **Message**: Strong school-family connections"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'events-montessori-celebration-img-3692-1580x2106',
  'events-montessori-celebration-img-3692-1580x2106',
  '{"originalFilename":"IMG_3692.png","optimizedFilename":"events-montessori-celebration-img-3692-1580x2106.webp","category":"events","originalWidth":1580,"originalHeight":2106,"aspectRatio":"3:4","format":"webp","primaryFocalX":55,"primaryFocalY":45,"primaryFocalWeight":10,"primaryFocalDescription":"Seasonal celebration with students","secondaryFocalX":30,"secondaryFocalY":40,"secondaryFocalWeight":8,"secondaryFocalDescription":"Festive celebration elements","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Seasonal celebration with students at Spicebush Montessori School","seoKeywords":["celebration","community","events","gathering","special occasion"],"contextualDescription":"Seasonal celebration with students","usedOn":[],"primaryUse":"Student celebration events","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":false,"dominantColors":["celebration-joy","festive-colors","student-engagement"],"lighting":"natural","activity":"student celebration","setting":"school event","season":"various","quality":"medium","isRecent":false,"priority":false,"body":"# Student Celebration Event\n\nThis vertical image captures students participating in a seasonal celebration, showing the joy and engagement that special events bring to the school community.\n\n## Visual Analysis\n- **Emotional Impact**: Celebration, student joy, participation\n- **Educational Content**: Event participation, celebration skills\n- **Composition**: Vertical view of student celebration\n- **Engagement**: Active student involvement\n\n## Usage Guidelines\n- **Primary Use**: Student event participation\n- **Secondary Use**: Celebration activities showcase\n- **Focal Point**: Students actively celebrating\n- **Message**: Joy in community celebrations"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'events-montessori-celebration-img-3719-1776x1332',
  'events-montessori-celebration-img-3719-1776x1332',
  '{"originalFilename":"IMG_3719.png","optimizedFilename":"events-montessori-celebration-img-3719-1776x1332.webp","category":"events","originalWidth":1776,"originalHeight":1332,"aspectRatio":"4:3","format":"webp","primaryFocalX":45,"primaryFocalY":35,"primaryFocalWeight":10,"primaryFocalDescription":"School community gathering","secondaryFocalX":60,"secondaryFocalY":50,"secondaryFocalWeight":8,"secondaryFocalDescription":"Community event atmosphere","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"School community gathering at Spicebush Montessori School","seoKeywords":["celebration","community","events","gathering","special occasion"],"contextualDescription":"School community gathering","usedOn":[],"primaryUse":"Community gathering showcase","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":false,"dominantColors":["community-warmth","gathering-space","event-atmosphere"],"lighting":"natural","activity":"community gathering","setting":"school event","season":"various","quality":"medium","isRecent":false,"priority":false,"body":"# School Community Gathering\n\nThis horizontal image captures a school community gathering, showcasing the strong bonds and connections fostered through Spicebush Montessori events.\n\n## Visual Analysis\n- **Emotional Impact**: Togetherness, community spirit, belonging\n- **Educational Content**: Community building, social connections\n- **Composition**: Wide view of community gathering\n- **Atmosphere**: Warm, inclusive event environment\n\n## Usage Guidelines\n- **Primary Use**: Community events documentation\n- **Secondary Use**: School culture showcase\n- **Focal Point**: Community members gathered together\n- **Message**: Strong school community bonds"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'events-montessori-celebration-img-4028-1516x2021',
  'events-montessori-celebration-img-4028-1516x2021',
  '{"originalFilename":"IMG_4028.png","optimizedFilename":"events-montessori-celebration-img-4028-1516x2021.webp","category":"events","originalWidth":1516,"originalHeight":2021,"aspectRatio":"3:4","format":"webp","primaryFocalX":55,"primaryFocalY":45,"primaryFocalWeight":10,"primaryFocalDescription":"Seasonal celebration with students","secondaryFocalX":30,"secondaryFocalY":40,"secondaryFocalWeight":8,"secondaryFocalDescription":"Festive seasonal activities","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Seasonal celebration with students at Spicebush Montessori School","seoKeywords":["celebration","community","events","gathering","special occasion"],"contextualDescription":"Seasonal celebration with students","usedOn":[],"primaryUse":"Seasonal events documentation","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":false,"dominantColors":["seasonal-colors","festive-decorations","celebration-atmosphere"],"lighting":"natural","activity":"seasonal celebration","setting":"school event","season":"various","quality":"medium","isRecent":false,"priority":false,"body":"# Seasonal School Celebration\n\nThis festive image captures students engaged in seasonal celebration activities, demonstrating how special events enrich the Montessori experience throughout the year.\n\n## Visual Analysis\n- **Emotional Impact**: Excitement, seasonal joy, tradition\n- **Educational Content**: Seasonal awareness, cultural traditions\n- **Composition**: Vertical format of celebration activities\n- **Community**: Shared seasonal experiences\n\n## Usage Guidelines\n- **Primary Use**: Seasonal celebration pages\n- **Secondary Use**: School traditions showcase\n- **Focal Point**: Students enjoying seasonal festivities\n- **Message**: Year-round community celebrations"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'events-montessori-celebration-img-4394-1404x1872',
  'events-montessori-celebration-img-4394-1404x1872',
  '{"originalFilename":"IMG_4394.png","optimizedFilename":"events-montessori-celebration-img-4394-1404x1872.webp","category":"events","originalWidth":1404,"originalHeight":1872,"aspectRatio":"3:4","format":"webp","primaryFocalX":50,"primaryFocalY":40,"primaryFocalWeight":10,"primaryFocalDescription":"Cultural celebration in the classroom","secondaryFocalX":35,"secondaryFocalY":55,"secondaryFocalWeight":8,"secondaryFocalDescription":"Community celebration atmosphere","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Cultural celebration in the classroom at Spicebush Montessori School","seoKeywords":["celebration","community","events","gathering","special occasion"],"contextualDescription":"Cultural celebration in the classroom","usedOn":[],"primaryUse":"Community events showcase","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":false,"dominantColors":["celebration-colors","festive-atmosphere","cultural-elements"],"lighting":"natural","activity":"cultural celebration","setting":"classroom","season":"various","quality":"medium","isRecent":false,"priority":false,"body":"# Cultural Classroom Celebration\n\nThis warm image captures a cultural celebration within the classroom, showcasing how Spicebush Montessori honors diversity and builds community through special events.\n\n## Visual Analysis\n- **Emotional Impact**: Joy, cultural appreciation, community\n- **Educational Content**: Cultural awareness, celebration traditions\n- **Composition**: Vertical view of celebration activities\n- **Atmosphere**: Festive and inclusive environment\n\n## Usage Guidelines\n- **Primary Use**: Cultural celebration documentation\n- **Secondary Use**: Community diversity showcase\n- **Focal Point**: Children participating in cultural event\n- **Message**: Celebrating diversity and community"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'gallery-montessori-collaborative-building-teamwork',
  'gallery-montessori-collaborative-building-teamwork',
  '{"originalFilename":"collaborative-building.png","optimizedFilename":"gallery-montessori-collaborative-building-teamwork-1200x800.webp","category":"gallery","originalWidth":1200,"originalHeight":800,"aspectRatio":"3:2","format":"webp","primaryFocalX":45,"primaryFocalY":40,"primaryFocalWeight":10,"primaryFocalDescription":"Multiple children collaborating on construction project","secondaryFocalX":55,"secondaryFocalY":55,"secondaryFocalWeight":8,"secondaryFocalDescription":"Impressive collaborative structure taking shape","mobileCropX":30,"mobileCropY":25,"mobileCropWidth":55,"mobileCropHeight":60,"tabletCropX":15,"tabletCropY":15,"tabletCropWidth":80,"tabletCropHeight":75,"altText":"Group of children working together on large building project, demonstrating collaboration and engineering skills","seoKeywords":["collaborative building","teamwork","construction play","STEM education","group project","engineering skills","cooperation"],"contextualDescription":"Collaborative building projects develop social skills, spatial reasoning, and problem-solving through shared construction challenges","usedOn":["gallery-collaboration","programs-STEM"],"primaryUse":"Gallery showcasing collaborative work","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["natural-wood","bright-blocks","engaged-faces","warm-classroom"],"lighting":"indoor","activity":"collaborative construction","setting":"classroom","priority":false,"compressed":true,"hasWebP":true,"hasSrcSet":true,"lazyLoad":true,"body":"# Building Together: Collaborative Construction\n\nThis gallery image showcases the power of collaborative learning as children work together on an ambitious building project. The concentration and cooperation visible demonstrates key Montessori principles in action.\n\n## Visual Analysis\n- **Emotional Impact**: Engagement, cooperation, shared purpose\n- **Educational Content**: Engineering concepts, teamwork, planning\n- **Composition**: Multiple perspectives creating unified whole\n- **Symbolism**: Knowledge built through collaboration\n\n## Usage Guidelines\n- **Primary Use**: Gallery of collaborative activities\n- **Secondary Use**: STEM and teamwork showcase\n- **Focal Point**: Children''s collaborative interaction\n- **Message**: Great things achieved through cooperation"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'gallery-montessori-food-preparation-practical-life',
  'gallery-montessori-food-preparation-practical-life',
  '{"originalFilename":"food-preparation.png","optimizedFilename":"gallery-montessori-food-preparation-practical-life-1200x800.webp","category":"gallery","originalWidth":1200,"originalHeight":800,"aspectRatio":"3:2","format":"webp","primaryFocalX":50,"primaryFocalY":45,"primaryFocalWeight":10,"primaryFocalDescription":"Child''s hands carefully preparing food with concentration","secondaryFocalX":35,"secondaryFocalY":60,"secondaryFocalWeight":8,"secondaryFocalDescription":"Fresh vegetables and preparation tools arranged","mobileCropX":30,"mobileCropY":30,"mobileCropWidth":55,"mobileCropHeight":55,"tabletCropX":20,"tabletCropY":20,"tabletCropWidth":70,"tabletCropHeight":70,"altText":"Child engaged in food preparation activity, developing practical life skills and independence in Montessori classroom","seoKeywords":["food preparation","practical life","life skills","independence","cooking skills","montessori kitchen","real work"],"contextualDescription":"Food preparation activities teach real-life skills, following sequences, and contribute to classroom community through meaningful work","usedOn":["gallery-practical-life","programs-daily-living"],"primaryUse":"Gallery showcasing practical life activities","hasHumanFaces":false,"hasChildren":true,"hasMonressoriMaterials":false,"dominantColors":["fresh-green","bright-orange","natural-wood","kitchen-whites"],"lighting":"natural","activity":"food preparation","setting":"classroom","priority":false,"compressed":true,"hasWebP":true,"hasSrcSet":true,"lazyLoad":true,"body":"# Real Work: Food Preparation Skills\n\nThis practical life activity demonstrates how children develop independence through meaningful work. Food preparation teaches sequencing, fine motor control, and contributes to the classroom community.\n\n## Visual Analysis\n- **Emotional Impact**: Concentration, purposeful work, independence\n- **Educational Content**: Sequencing, knife skills, nutrition awareness\n- **Composition**: Clear view of careful preparation technique\n- **Symbolism**: Real work builds real skills\n\n## Usage Guidelines\n- **Primary Use**: Gallery of practical life activities\n- **Secondary Use**: Daily living skills program\n- **Focal Point**: Careful hands performing real work\n- **Message**: Children capable of meaningful contributions"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'gallery-montessori-playground-action-gross-motor',
  'gallery-montessori-playground-action-gross-motor',
  '{"originalFilename":"playground-action.png","optimizedFilename":"gallery-montessori-playground-action-gross-motor-1200x800.webp","category":"gallery","originalWidth":1200,"originalHeight":800,"aspectRatio":"3:2","format":"webp","primaryFocalX":55,"primaryFocalY":35,"primaryFocalWeight":10,"primaryFocalDescription":"Child mid-motion on playground equipment showing joyful movement","secondaryFocalX":30,"secondaryFocalY":50,"secondaryFocalWeight":8,"secondaryFocalDescription":"Natural wood playground structures integrated with environment","mobileCropX":35,"mobileCropY":15,"mobileCropWidth":50,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":75,"tabletCropHeight":75,"altText":"Child actively playing on natural wood playground equipment, developing gross motor skills through outdoor movement","seoKeywords":["outdoor play","gross motor development","natural playground","active learning","movement education","outdoor classroom","physical development"],"contextualDescription":"Dynamic outdoor play on natural playground equipment supports physical development and connection with nature","usedOn":["gallery-outdoor","programs-movement"],"primaryUse":"Gallery showcasing outdoor activities","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":false,"dominantColors":["sky-blue","natural-wood","green-foliage","earth-tones"],"lighting":"natural","activity":"playground movement","setting":"outdoor","priority":false,"compressed":true,"hasWebP":true,"hasSrcSet":true,"lazyLoad":true,"body":"# Active Learning: Playground Movement\n\nThis action shot captures the joy of movement and physical development on our natural playground. The integration of natural materials creates an organic learning environment for gross motor development.\n\n## Visual Analysis\n- **Emotional Impact**: Freedom, joy, physical confidence\n- **Educational Content**: Gross motor skills, risk assessment, body awareness\n- **Composition**: Dynamic movement frozen in time\n- **Symbolism**: Learning through whole-body engagement\n\n## Usage Guidelines\n- **Primary Use**: Gallery of outdoor activities\n- **Secondary Use**: Movement curriculum showcase\n- **Focal Point**: Child''s expression of joyful motion\n- **Message**: Physical development is integral to learning"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'gallery-montessori-pouring-exercise-concentration',
  'gallery-montessori-pouring-exercise-concentration',
  '{"originalFilename":"pouring-exercise.png","optimizedFilename":"gallery-montessori-pouring-exercise-concentration-1200x800.webp","category":"gallery","originalWidth":1200,"originalHeight":800,"aspectRatio":"3:2","format":"webp","primaryFocalX":35,"primaryFocalY":30,"primaryFocalWeight":10,"primaryFocalDescription":"Child''s face showing deep concentration during pouring","secondaryFocalX":55,"secondaryFocalY":55,"secondaryFocalWeight":8,"secondaryFocalDescription":"Hands carefully controlling water pouring between vessels","mobileCropX":25,"mobileCropY":20,"mobileCropWidth":55,"mobileCropHeight":60,"tabletCropX":15,"tabletCropY":15,"tabletCropWidth":75,"tabletCropHeight":75,"altText":"Child deeply concentrated on water pouring exercise, developing fine motor control and focus through practical life activity","seoKeywords":["pouring exercise","concentration","practical life","fine motor control","focus development","water transfer","precision work"],"contextualDescription":"Classic Montessori pouring exercises develop concentration, hand-eye coordination, and prepare for later academic work","usedOn":["gallery-concentration","programs-practical-life"],"primaryUse":"Gallery demonstrating deep concentration","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["clear-water","silver-pitchers","focused-lighting","calm-tones"],"lighting":"indoor","activity":"pouring exercise","setting":"classroom","priority":false,"compressed":true,"hasWebP":true,"hasSrcSet":true,"lazyLoad":true,"body":"# Deep Focus: Water Pouring Exercise\n\nThis quintessential Montessori moment captures the profound concentration that develops through practical life exercises. The simple act of pouring water builds focus that transfers to all learning.\n\n## Visual Analysis\n- **Emotional Impact**: Intense concentration, calm focus\n- **Educational Content**: Hand control, sequential movement, precision\n- **Composition**: Close framing emphasizes concentration\n- **Symbolism**: Simple tasks build profound skills\n\n## Usage Guidelines\n- **Primary Use**: Gallery showcasing concentration development\n- **Secondary Use**: Practical life curriculum examples\n- **Focal Point**: Child''s expression of deep focus\n- **Message**: Concentration developed through purposeful activity"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'gallery-montessori-proud-artist-accomplishment-joy',
  'gallery-montessori-proud-artist-accomplishment-joy',
  '{"originalFilename":"proud-artist.png","optimizedFilename":"gallery-montessori-proud-artist-accomplishment-joy-1200x800.webp","category":"gallery","originalWidth":1200,"originalHeight":800,"aspectRatio":"3:2","format":"webp","primaryFocalX":35,"primaryFocalY":30,"primaryFocalWeight":10,"primaryFocalDescription":"Child''s beaming face showing pride in artistic creation","secondaryFocalX":65,"secondaryFocalY":50,"secondaryFocalWeight":8,"secondaryFocalDescription":"Completed artwork being proudly displayed","mobileCropX":20,"mobileCropY":15,"mobileCropWidth":55,"mobileCropHeight":60,"tabletCropX":10,"tabletCropY":10,"tabletCropWidth":85,"tabletCropHeight":80,"altText":"Child proudly displaying completed artwork, radiating joy and accomplishment from creative achievement","seoKeywords":["proud artist","accomplishment","self-esteem","creative achievement","artistic pride","montessori success","confidence building"],"contextualDescription":"The joy of accomplishment shines through as a young artist proudly shares their creative work, building confidence and self-expression","usedOn":["gallery-achievements","about-confidence"],"primaryUse":"Gallery celebrating student achievements","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":false,"dominantColors":["bright-smile","colorful-artwork","warm-lighting","happy-tones"],"lighting":"natural","activity":"artwork presentation","setting":"classroom","priority":false,"compressed":true,"hasWebP":true,"hasSrcSet":true,"lazyLoad":true,"body":"# Pride in Creation: Artistic Achievement\n\nThis heartwarming image captures the pure joy of creative accomplishment. The child''s radiant pride in their artwork exemplifies how Montessori education builds confidence through meaningful work.\n\n## Visual Analysis\n- **Emotional Impact**: Joy, pride, self-confidence\n- **Educational Content**: Self-esteem building, artistic completion, sharing work\n- **Composition**: Child and artwork equally featured\n- **Symbolism**: Success through creative expression\n\n## Usage Guidelines\n- **Primary Use**: Gallery celebrating achievements\n- **Secondary Use**: About page on building confidence\n- **Focal Point**: Child''s expression of pride and joy\n- **Message**: Every child''s work is valued and celebrated"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'gallery-montessori-watercolor-painting-artistic-expression',
  'gallery-montessori-watercolor-painting-artistic-expression',
  '{"originalFilename":"watercolor-painting.png","optimizedFilename":"gallery-montessori-watercolor-painting-artistic-expression-1200x800.webp","category":"gallery","originalWidth":1200,"originalHeight":800,"aspectRatio":"3:2","format":"webp","primaryFocalX":40,"primaryFocalY":35,"primaryFocalWeight":10,"primaryFocalDescription":"Child deeply focused on watercolor painting technique","secondaryFocalX":60,"secondaryFocalY":55,"secondaryFocalWeight":8,"secondaryFocalDescription":"Vibrant watercolor artwork taking shape on paper","mobileCropX":25,"mobileCropY":20,"mobileCropWidth":55,"mobileCropHeight":60,"tabletCropX":15,"tabletCropY":10,"tabletCropWidth":75,"tabletCropHeight":75,"altText":"Child concentrating on watercolor painting, developing artistic skills and creative expression in Montessori art program","seoKeywords":["watercolor painting","art education","creative expression","fine motor skills","artistic development","montessori art","concentration"],"contextualDescription":"Watercolor painting develops fine motor control, color theory understanding, and creative expression through careful technique","usedOn":["gallery-art","programs-creative-arts"],"primaryUse":"Gallery showcasing artistic activities","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":false,"dominantColors":["watercolor-blue","soft-pink","paint-yellow","paper-white"],"lighting":"natural","activity":"artistic creation","setting":"classroom","priority":false,"compressed":true,"hasWebP":true,"hasSrcSet":true,"lazyLoad":true,"body":"# Artistic Expression: Watercolor Mastery\n\nThis intimate moment captures the deep concentration required for watercolor painting. The child''s careful brush control and color mixing demonstrate how art develops both technical skill and creative expression.\n\n## Visual Analysis\n- **Emotional Impact**: Peaceful concentration, creative flow\n- **Educational Content**: Color theory, brush technique, artistic planning\n- **Composition**: Close view emphasizes precision and care\n- **Symbolism**: Art as a form of mindful practice\n\n## Usage Guidelines\n- **Primary Use**: Gallery of artistic activities\n- **Secondary Use**: Creative arts program details\n- **Focal Point**: Child''s focused expression and brush control\n- **Message**: Art education develops concentration and skill"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'group-montessori-collaboration-img-6537-1485x1980',
  'group-montessori-collaboration-img-6537-1485x1980',
  '{"originalFilename":"IMG_6537.png","optimizedFilename":"group-montessori-collaboration-img-6537-1485x1980.webp","category":"group","originalWidth":1485,"originalHeight":1980,"aspectRatio":"3:4","format":"webp","primaryFocalX":50,"primaryFocalY":40,"primaryFocalWeight":10,"primaryFocalDescription":"Students helping each other learn","secondaryFocalX":35,"secondaryFocalY":55,"secondaryFocalWeight":8,"secondaryFocalDescription":"Collaborative exploration","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Students helping each other learn at Spicebush Montessori School","seoKeywords":["collaboration","group work","mixed age","peer learning","community"],"contextualDescription":"Students helping each other learn","usedOn":[],"primaryUse":"Collaborative learning benefits","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["collaborative-warmth","shared-learning","classroom-community"],"lighting":"natural","activity":"peer support","setting":"classroom","season":"winter","quality":"medium","isRecent":false,"priority":false,"body":"# Mutual Learning Support\n\nThis warm image captures students supporting each other''s learning journey, demonstrating the natural mentorship that develops in mixed-age Montessori classrooms.\n\n## Visual Analysis\n- **Emotional Impact**: Mutual support, shared understanding\n- **Educational Content**: Peer learning, collaborative discovery\n- **Composition**: Vertical format showing close interaction\n- **Community**: Supportive learning relationships\n\n## Usage Guidelines\n- **Primary Use**: Community learning culture\n- **Secondary Use**: Mixed-age benefits documentation\n- **Focal Point**: Students learning together\n- **Message**: Emphasizes supportive learning community"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'group-montessori-collaboration-img-6543-1933x1450',
  'group-montessori-collaboration-img-6543-1933x1450',
  '{"originalFilename":"IMG_6543.png","optimizedFilename":"group-montessori-collaboration-img-6543-1933x1450.webp","category":"group","originalWidth":1933,"originalHeight":1450,"aspectRatio":"4:3","format":"webp","primaryFocalX":55,"primaryFocalY":45,"primaryFocalWeight":10,"primaryFocalDescription":"Mixed-age students working together","secondaryFocalX":30,"secondaryFocalY":40,"secondaryFocalWeight":8,"secondaryFocalDescription":"Collaborative learning dynamics","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Mixed-age students working together at Spicebush Montessori School","seoKeywords":["collaboration","group work","mixed age","peer learning","community"],"contextualDescription":"Mixed-age students working together","usedOn":[],"primaryUse":"Mixed-age benefits section","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["collaborative-tones","classroom-light","working-together"],"lighting":"natural","activity":"collaborative work","setting":"classroom","season":"winter","quality":"high","isRecent":false,"priority":false,"body":"# Mixed-Age Collaboration\n\nThis heartwarming image showcases the benefits of mixed-age classrooms, with older and younger students naturally working together and learning from each other.\n\n## Visual Analysis\n- **Emotional Impact**: Mentorship, cooperation, mutual support\n- **Educational Content**: Peer teaching, age diversity benefits\n- **Composition**: Horizontal view of collaborative work\n- **Dynamics**: Natural mentoring relationships\n\n## Usage Guidelines\n- **Primary Use**: Mixed-age classroom philosophy\n- **Secondary Use**: Peer learning documentation\n- **Focal Point**: Age diversity in collaborative work\n- **Message**: Shows benefits of multi-age grouping"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'group-montessori-collaboration-img-6599-1362x2213',
  'group-montessori-collaboration-img-6599-1362x2213',
  '{"originalFilename":"IMG_6599.png","optimizedFilename":"group-montessori-collaboration-img-6599-1362x2213.webp","category":"group","originalWidth":1362,"originalHeight":2213,"aspectRatio":"9:16","format":"webp","primaryFocalX":45,"primaryFocalY":35,"primaryFocalWeight":10,"primaryFocalDescription":"Students helping each other learn","secondaryFocalX":60,"secondaryFocalY":50,"secondaryFocalWeight":8,"secondaryFocalDescription":"Peer mentoring dynamics","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Students helping each other learn at Spicebush Montessori School","seoKeywords":["collaboration","group work","mixed age","peer learning","community"],"contextualDescription":"Students helping each other learn","usedOn":[],"primaryUse":"Peer teaching showcase","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["helpful-atmosphere","learning-together","supportive-environment"],"lighting":"natural","activity":"peer teaching","setting":"classroom","season":"winter","quality":"medium","isRecent":false,"priority":false,"body":"# Peer Teaching and Support\n\nThis touching vertical image captures the essence of peer learning, showing students naturally helping each other master new concepts in the Montessori classroom.\n\n## Visual Analysis\n- **Emotional Impact**: Support, mentorship, caring community\n- **Educational Content**: Peer teaching, knowledge sharing\n- **Composition**: Tall format emphasizing one-on-one help\n- **Relationship**: Natural mentoring between students\n\n## Usage Guidelines\n- **Primary Use**: Peer teaching benefits section\n- **Secondary Use**: Community learning atmosphere\n- **Focal Point**: Students helping each other\n- **Message**: Shows natural peer support system"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'group-montessori-collaboration-img-7509-2448x3264',
  'group-montessori-collaboration-img-7509-2448x3264',
  '{"originalFilename":"IMG_7509.jpg","optimizedFilename":"group-montessori-collaboration-img-7509-2448x3264.webp","category":"group","originalWidth":2448,"originalHeight":3264,"aspectRatio":"3:4","format":"webp","primaryFocalX":55,"primaryFocalY":45,"primaryFocalWeight":10,"primaryFocalDescription":"Group lesson in the Montessori classroom","secondaryFocalX":30,"secondaryFocalY":40,"secondaryFocalWeight":8,"secondaryFocalDescription":"Mixed-age peer learning","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Group lesson in the Montessori classroom at Spicebush Montessori School","seoKeywords":["collaboration","group work","mixed age","peer learning","community"],"contextualDescription":"Group lesson in the Montessori classroom","usedOn":[],"primaryUse":"Collaborative learning showcase","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["classroom-warmth","group-energy","natural-light"],"lighting":"natural","activity":"group lesson","setting":"classroom","season":"spring","quality":"high","isRecent":false,"priority":false,"body":"# Group Learning Experience\n\nThis vibrant image captures the collaborative spirit of Montessori education, showing students of different ages working together in a group lesson.\n\n## Visual Analysis\n- **Emotional Impact**: Community, shared learning, engagement\n- **Educational Content**: Collaborative skills, peer teaching\n- **Composition**: Dynamic group arrangement\n- **Interaction**: Active participation and discussion\n\n## Usage Guidelines\n- **Primary Use**: Group learning methodology pages\n- **Secondary Use**: Mixed-age classroom benefits\n- **Focal Point**: Students engaged in group discussion\n- **Message**: Emphasizes collaborative learning culture"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'group-montessori-collaboration-img-8774-1322x1579',
  'group-montessori-collaboration-img-8774-1322x1579',
  '{"originalFilename":"IMG_8774.png","optimizedFilename":"group-montessori-collaboration-img-8774-1322x1579.webp","category":"group","originalWidth":1322,"originalHeight":1579,"aspectRatio":"5:6","format":"webp","primaryFocalX":50,"primaryFocalY":40,"primaryFocalWeight":10,"primaryFocalDescription":"Children collaborating on group project","secondaryFocalX":35,"secondaryFocalY":55,"secondaryFocalWeight":8,"secondaryFocalDescription":"Collaborative problem-solving","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Children collaborating on group project at Spicebush Montessori School","seoKeywords":["collaboration","group work","mixed age","peer learning","community"],"contextualDescription":"Children collaborating on group project","usedOn":[],"primaryUse":"Project-based learning section","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["project-work","collaborative-space","engaged-learning"],"lighting":"natural","activity":"group project","setting":"classroom","season":"spring","quality":"medium","isRecent":true,"priority":false,"body":"# Group Project Collaboration\n\nThis dynamic image showcases children working together on a group project, highlighting the collaborative skills developed through Montessori education.\n\n## Visual Analysis\n- **Emotional Impact**: Teamwork, shared goals, active engagement\n- **Educational Content**: Project-based learning, cooperation\n- **Composition**: Vertical framing of group work\n- **Process**: Collaborative problem-solving in action\n\n## Usage Guidelines\n- **Primary Use**: Project-based learning examples\n- **Secondary Use**: Teamwork skills development\n- **Focal Point**: Children working together on project\n- **Message**: Demonstrates collaborative project work"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'group-montessori-collaboration-img-9835-1582x1187',
  'group-montessori-collaboration-img-9835-1582x1187',
  '{"originalFilename":"IMG_9835.png","optimizedFilename":"group-montessori-collaboration-img-9835-1582x1187.webp","category":"group","originalWidth":1582,"originalHeight":1187,"aspectRatio":"4:3","format":"webp","primaryFocalX":50,"primaryFocalY":40,"primaryFocalWeight":10,"primaryFocalDescription":"Collaborative learning experience","secondaryFocalX":35,"secondaryFocalY":55,"secondaryFocalWeight":8,"secondaryFocalDescription":"Group work interaction","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Collaborative learning experience at Spicebush Montessori School","seoKeywords":["collaboration","group work","mixed age","peer learning","community"],"contextualDescription":"Collaborative learning experience","usedOn":[],"primaryUse":"Collaborative learning programs","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["group-work","shared-space","collaborative-light"],"lighting":"natural","activity":"group collaboration","setting":"classroom","season":"fall","quality":"medium","isRecent":true,"priority":false,"body":"# Collaborative Learning Experience\n\nThis engaging image captures students immersed in collaborative work, demonstrating the social learning that naturally occurs in Montessori environments.\n\n## Visual Analysis\n- **Emotional Impact**: Teamwork, shared discovery, engagement\n- **Educational Content**: Social skills, collaborative problem-solving\n- **Composition**: Wide view of group dynamics\n- **Activity**: Shared learning experience\n\n## Usage Guidelines\n- **Primary Use**: Social learning documentation\n- **Secondary Use**: Collaborative skills development\n- **Focal Point**: Group engaged in shared work\n- **Message**: Highlights collaborative learning benefits"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'homepage-montessori-child-exploring-globe-joyful-learning',
  'homepage-montessori-child-exploring-globe-joyful-learning',
  '{"originalFilename":"child-globe-joy.png","optimizedFilename":"homepage-montessori-child-exploring-globe-joyful-learning-1200x800.webp","category":"homepage","originalWidth":1200,"originalHeight":800,"aspectRatio":"3:2","format":"webp","primaryFocalX":65,"primaryFocalY":35,"primaryFocalWeight":10,"primaryFocalDescription":"Child''s joyful facial expression while discovering geography","secondaryFocalX":45,"secondaryFocalY":60,"secondaryFocalWeight":8,"secondaryFocalDescription":"Child''s hands touching and exploring the globe","mobileCropX":40,"mobileCropY":15,"mobileCropWidth":60,"mobileCropHeight":70,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":80,"tabletCropHeight":85,"altText":"Joyful child exploring geography with Montessori globe, showing engaged learning and discovery at Spicebush Montessori School","seoKeywords":["montessori education","child learning","geography","discovery","joyful learning","hands-on education","globe work","montessori materials"],"contextualDescription":"A young child displays pure joy and engagement while exploring a Montessori geography globe, exemplifying the wonder and discovery that characterizes authentic Montessori education","usedOn":["homepage-hero","about-page"],"primaryUse":"Homepage hero section background","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["warm-brown","golden-yellow","natural-wood","soft-blue"],"lighting":"natural","activity":"geography exploration","setting":"classroom","priority":true,"body":"# Hero Image: Child Exploring Globe\n\nThis exceptional photograph captures the essence of Montessori education - a child''s natural curiosity and joy in discovery. The image shows a young learner engaged with a geography globe, demonstrating the hands-on, experiential learning that defines our approach.\n\n## Visual Analysis\n- **Emotional Impact**: High - child''s genuine joy and concentration\n- **Educational Content**: Geography/cultural studies material\n- **Composition**: Rule of thirds with child''s face in upper right power position\n- **Lighting**: Warm, natural classroom lighting creates inviting atmosphere\n\n## Usage Guidelines\n- **Primary Use**: Homepage hero section with overlay text\n- **Secondary Use**: About page to illustrate engaged learning\n- **Focal Point**: Ensure child''s face remains visible at all crop sizes\n- **Text Overlay**: Lower left area provides space for headline text"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'homepage-montessori-children-autumn-hero-seasonal-learning',
  'homepage-montessori-children-autumn-hero-seasonal-learning',
  '{"originalFilename":"children-autumn-leaves-hero.png","optimizedFilename":"homepage-montessori-children-autumn-hero-seasonal-learning-1920x1080.webp","category":"homepage","originalWidth":1920,"originalHeight":1080,"aspectRatio":"16:9","format":"webp","primaryFocalX":50,"primaryFocalY":40,"primaryFocalWeight":10,"primaryFocalDescription":"Child''s face expressing pure delight while tossing autumn leaves","secondaryFocalX":35,"secondaryFocalY":30,"secondaryFocalWeight":8,"secondaryFocalDescription":"Colorful leaves caught mid-air creating dynamic movement","mobileCropX":30,"mobileCropY":25,"mobileCropWidth":50,"mobileCropHeight":55,"tabletCropX":20,"tabletCropY":15,"tabletCropWidth":70,"tabletCropHeight":70,"altText":"Children throwing colorful autumn leaves in the air with pure joy, showcasing outdoor Montessori learning and seasonal exploration","seoKeywords":["montessori hero image","outdoor learning","autumn activities","child-led exploration","nature education","seasonal curriculum","joyful learning"],"contextualDescription":"Hero image capturing the essence of joyful, nature-based learning through spontaneous play with autumn leaves","usedOn":["homepage-hero-primary","seasonal-landing"],"primaryUse":"Primary homepage hero image for fall season","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":false,"dominantColors":["vibrant-orange","golden-yellow","warm-red","sky-blue"],"lighting":"natural","activity":"seasonal play","setting":"outdoor","priority":true,"compressed":true,"hasWebP":true,"hasSrcSet":true,"lazyLoad":false,"body":"# Hero Image: Autumn Joy and Discovery\n\nThis hero image perfectly encapsulates the Spicebush Montessori experience - children learning through joyful interaction with nature. The dynamic composition and genuine expressions create an immediate emotional connection.\n\n## Visual Analysis\n- **Emotional Impact**: Unbridled joy, freedom, natural learning\n- **Educational Content**: Seasonal awareness, gross motor development, sensory experience\n- **Composition**: Dynamic movement with leaves creating visual energy\n- **Symbolism**: Freedom to explore and learn at one''s own pace\n\n## Usage Guidelines\n- **Primary Use**: Main homepage hero image during fall months\n- **Secondary Use**: Seasonal program promotions\n- **Focal Point**: Child''s joyful expression amid falling leaves\n- **Message**: Learning is joyful, natural, and child-directed"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'homepage-montessori-children-autumn-leaves-outdoor-exploration',
  'homepage-montessori-children-autumn-leaves-outdoor-exploration',
  '{"originalFilename":"children-autumn-leaves.png","optimizedFilename":"homepage-montessori-children-autumn-leaves-outdoor-exploration-1200x800.webp","category":"homepage","originalWidth":1200,"originalHeight":800,"aspectRatio":"3:2","format":"webp","primaryFocalX":45,"primaryFocalY":35,"primaryFocalWeight":10,"primaryFocalDescription":"Children''s joyful expressions while exploring autumn leaves","secondaryFocalX":60,"secondaryFocalY":55,"secondaryFocalWeight":8,"secondaryFocalDescription":"Hands gathering and examining fall leaves","mobileCropX":25,"mobileCropY":20,"mobileCropWidth":60,"mobileCropHeight":65,"tabletCropX":15,"tabletCropY":10,"tabletCropWidth":80,"tabletCropHeight":80,"altText":"Group of children joyfully exploring and collecting colorful autumn leaves outdoors, demonstrating Montessori nature-based learning","seoKeywords":["montessori outdoor education","nature exploration","autumn activities","hands-on learning","outdoor classroom","seasonal learning","nature connection"],"contextualDescription":"Children engage with nature through seasonal exploration, embodying Montessori''s emphasis on connecting with the natural world","usedOn":["homepage-hero","programs-outdoor"],"primaryUse":"Homepage hero section alternate image","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":false,"dominantColors":["autumn-orange","golden-yellow","deep-red","earth-brown"],"lighting":"natural","activity":"nature exploration","setting":"outdoor","priority":true,"compressed":true,"hasWebP":true,"hasSrcSet":true,"lazyLoad":false,"body":"# Autumn Exploration: Nature-Based Learning\n\nThis vibrant image captures the joy of outdoor learning as children explore autumn''s treasures. The natural curiosity and wonder on their faces exemplifies Montessori''s approach to environmental education.\n\n## Visual Analysis\n- **Emotional Impact**: Pure joy, wonder, discovery\n- **Educational Content**: Nature study, seasonal awareness, sensory exploration\n- **Composition**: Dynamic grouping with colorful leaf collection\n- **Symbolism**: Connection between children and natural world\n\n## Usage Guidelines\n- **Primary Use**: Homepage hero section for seasonal variation\n- **Secondary Use**: Outdoor education program pages\n- **Focal Point**: Children''s expressions of wonder and discovery\n- **Message**: Reinforces outdoor learning and nature connection"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'homepage-montessori-math-numbers-concentration-deep-learning',
  'homepage-montessori-math-numbers-concentration-deep-learning',
  '{"originalFilename":"montessori-numbers.png","optimizedFilename":"homepage-montessori-math-numbers-concentration-deep-learning-1200x800.webp","category":"homepage","originalWidth":1200,"originalHeight":800,"aspectRatio":"3:2","format":"webp","primaryFocalX":35,"primaryFocalY":25,"primaryFocalWeight":10,"primaryFocalDescription":"Child''s face showing deep concentration during math work","secondaryFocalX":55,"secondaryFocalY":65,"secondaryFocalWeight":9,"secondaryFocalDescription":"Hands manipulating Montessori number tiles and mathematical materials","mobileCropX":15,"mobileCropY":10,"mobileCropWidth":70,"mobileCropHeight":80,"tabletCropX":10,"tabletCropY":5,"tabletCropWidth":85,"tabletCropHeight":90,"altText":"Child showing deep concentration while working with Montessori number materials, demonstrating self-directed mathematical learning","seoKeywords":["montessori math","number work","mathematical thinking","concentration","self-directed learning","number tiles","math materials","independent learning"],"contextualDescription":"A focused young learner engages deeply with Montessori mathematical materials, showcasing the concentration and independent learning that flourishes in our prepared environment","usedOn":["homepage-approach","programs-math"],"primaryUse":"Homepage approach section to demonstrate focused learning","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["natural-wood","red-number-tiles","warm-beige","soft-lighting"],"lighting":"indoor","activity":"mathematical exploration","setting":"classroom","priority":false,"body":"# Mathematical Focus: Number Work\n\nThis powerful image captures the hallmark of Montessori education - a child''s natural capacity for deep concentration when engaged with carefully designed learning materials. The photograph shows authentic mathematical work in progress.\n\n## Visual Analysis\n- **Emotional Impact**: High - demonstrates internal motivation and focus\n- **Educational Content**: Mathematical concepts through concrete materials\n- **Composition**: Child and materials create balanced learning tableau\n- **Detail**: Clear view of hands manipulating number tiles\n\n## Usage Guidelines\n- **Primary Use**: Homepage \"Our Approach\" section\n- **Secondary Use**: Programs page mathematics section\n- **Focal Point**: Child''s concentrated expression and working hands\n- **Context**: Ideal for explaining self-directed, concrete learning"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'homepage-montessori-pink-tower-concentration-building-skills',
  'homepage-montessori-pink-tower-concentration-building-skills',
  '{"originalFilename":"pink-tower-concentration.png","optimizedFilename":"homepage-montessori-pink-tower-concentration-building-skills-1200x800.webp","category":"homepage","originalWidth":1200,"originalHeight":800,"aspectRatio":"3:2","format":"webp","primaryFocalX":50,"primaryFocalY":45,"primaryFocalWeight":10,"primaryFocalDescription":"Child''s hands carefully placing pink tower cubes, showing fine motor development","secondaryFocalX":30,"secondaryFocalY":25,"secondaryFocalWeight":8,"secondaryFocalDescription":"Child''s concentrated facial expression during sensorial work","mobileCropX":25,"mobileCropY":30,"mobileCropWidth":60,"mobileCropHeight":65,"tabletCropX":15,"tabletCropY":15,"tabletCropWidth":75,"tabletCropHeight":80,"altText":"Child demonstrating concentration and fine motor skills while building the iconic Montessori pink tower, showcasing sensorial learning","seoKeywords":["montessori pink tower","sensorial materials","fine motor skills","concentration","three-dimensional thinking","montessori method","hands-on learning"],"contextualDescription":"A young learner engages with the classic Montessori pink tower, developing spatial awareness, concentration, and fine motor skills through this foundational sensorial material","usedOn":["homepage-programs","programs-sensorial"],"primaryUse":"Homepage programs overview section","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["pink-cubes","natural-wood","neutral-background","warm-lighting"],"lighting":"natural","activity":"sensorial construction","setting":"classroom","priority":false,"body":"# Sensorial Learning: Pink Tower Construction\n\nThis photograph captures one of Montessori education''s most recognizable materials in action. The pink tower serves as an introduction to mathematical concepts through three-dimensional sensorial exploration.\n\n## Visual Analysis\n- **Educational Content**: Classic Montessori sensorial material\n- **Skill Development**: Fine motor, spatial reasoning, concentration\n- **Composition**: Hands and materials create engaging focal point\n- **Age Appropriateness**: Perfect demonstration of 3-6 year old capabilities\n\n## Usage Guidelines\n- **Primary Use**: Programs section to showcase sensorial curriculum\n- **Secondary Use**: Homepage to represent hands-on learning\n- **Focal Point**: Child''s working hands demonstrate active engagement\n- **Educational Value**: Ideal for explaining concrete to abstract progression"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'homepage-spicebush-logo-brand-identity',
  'homepage-spicebush-logo-brand-identity',
  '{"originalFilename":"SpicebushLogo-03.png","optimizedFilename":"homepage-spicebush-logo-brand-identity-800x800.webp","category":"homepage","originalWidth":800,"originalHeight":800,"aspectRatio":"1:1","format":"webp","primaryFocalX":50,"primaryFocalY":50,"primaryFocalWeight":10,"primaryFocalDescription":"Spicebush Montessori School logo center","secondaryFocalX":50,"secondaryFocalY":50,"secondaryFocalWeight":1,"secondaryFocalDescription":"Full logo design","mobileCropX":0,"mobileCropY":0,"mobileCropWidth":100,"mobileCropHeight":100,"tabletCropX":0,"tabletCropY":0,"tabletCropWidth":100,"tabletCropHeight":100,"altText":"Spicebush Montessori School logo featuring natural botanical design elements","seoKeywords":["spicebush montessori","school logo","montessori brand","educational logo","spicebush","brand identity"],"contextualDescription":"Official Spicebush Montessori School logo representing nature-based education and growth","usedOn":["header","footer","admin","documents"],"primaryUse":"Site header and brand identity","hasHumanFaces":false,"hasChildren":false,"hasMonressoriMaterials":false,"dominantColors":["brand-green","logo-colors","white-background"],"lighting":"mixed","activity":"branding","setting":"mixed","priority":true,"compressed":true,"hasWebP":true,"hasSrcSet":false,"lazyLoad":false,"body":"# Brand Identity: Spicebush Logo\n\nThe Spicebush Montessori School logo embodies our connection to nature and growth-centered education. The botanical elements reflect our environmental values and natural learning approach.\n\n## Visual Analysis\n- **Emotional Impact**: Professional, natural, welcoming\n- **Educational Content**: Brand recognition, identity\n- **Composition**: Balanced botanical design\n- **Symbolism**: Growth, nature, education\n\n## Usage Guidelines\n- **Primary Use**: Header and footer branding\n- **Secondary Use**: Documents and communications\n- **Focal Point**: Centered logo design\n- **Message**: Nature-based Montessori education"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'individual-montessori-concentration-img-6989-1423x1897',
  'individual-montessori-concentration-img-6989-1423x1897',
  '{"originalFilename":"IMG_6989.png","optimizedFilename":"individual-montessori-concentration-img-6989-1423x1897.webp","category":"individual","originalWidth":1423,"originalHeight":1897,"aspectRatio":"3:4","format":"webp","primaryFocalX":50,"primaryFocalY":40,"primaryFocalWeight":10,"primaryFocalDescription":"Child deeply concentrated on individual work","secondaryFocalX":35,"secondaryFocalY":55,"secondaryFocalWeight":8,"secondaryFocalDescription":"Absorbed in learning process","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Child deeply concentrated on individual work at Spicebush Montessori School","seoKeywords":["concentration","individual work","independence","focus","self-directed"],"contextualDescription":"Child deeply concentrated on individual work","usedOn":[],"primaryUse":"Deep concentration showcase","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["deep-concentration","focused-work","quiet-atmosphere"],"lighting":"natural","activity":"concentrated individual work","setting":"classroom","season":"winter","quality":"medium","isRecent":false,"priority":false,"body":"# Profound Individual Concentration\n\nThis final individual category image powerfully captures the profound concentration that characterizes Montessori learning, with a child completely absorbed in their chosen work.\n\n## Visual Analysis\n- **Emotional Impact**: Total absorption, deep focus, peace\n- **Educational Content**: Concentration as learning foundation\n- **Composition**: Vertical format emphasizing individual space\n- **State**: Child in flow state of learning\n\n## Usage Guidelines\n- **Primary Use**: Concentration as cornerstone of learning\n- **Secondary Use**: Individual development documentation\n- **Focal Point**: Child''s complete absorption in work\n- **Message**: Demonstrates transformative power of concentration"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'individual-montessori-concentration-img-7291-1770x1931',
  'individual-montessori-concentration-img-7291-1770x1931',
  '{"originalFilename":"IMG_7291.png","optimizedFilename":"individual-montessori-concentration-img-7291-1770x1931.webp","category":"individual","originalWidth":1770,"originalHeight":1931,"aspectRatio":"11:12","format":"webp","primaryFocalX":45,"primaryFocalY":35,"primaryFocalWeight":10,"primaryFocalDescription":"Student working independently with materials","secondaryFocalX":60,"secondaryFocalY":50,"secondaryFocalWeight":8,"secondaryFocalDescription":"Focused material manipulation","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Student working independently with materials at Spicebush Montessori School","seoKeywords":["concentration","individual work","independence","focus","self-directed"],"contextualDescription":"Student working independently with materials","usedOn":[],"primaryUse":"Independent material work","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["independent-focus","material-work","concentrated-light"],"lighting":"natural","activity":"independent material work","setting":"classroom","season":"spring","quality":"medium","isRecent":false,"priority":false,"body":"# Independent Material Mastery\n\nThis nearly square image showcases a student working independently with materials, demonstrating the self-sufficiency and material mastery developed through Montessori education.\n\n## Visual Analysis\n- **Emotional Impact**: Confidence, independence, mastery\n- **Educational Content**: Material manipulation, skill development\n- **Composition**: Square format emphasizing focused work\n- **Skill**: Demonstrating material proficiency\n\n## Usage Guidelines\n- **Primary Use**: Independent work examples\n- **Secondary Use**: Material mastery documentation\n- **Focal Point**: Student''s confident material use\n- **Message**: Shows independent skill development"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'individual-montessori-concentration-img-7293-1732x2057',
  'individual-montessori-concentration-img-7293-1732x2057',
  '{"originalFilename":"IMG_7293.png","optimizedFilename":"individual-montessori-concentration-img-7293-1732x2057.webp","category":"individual","originalWidth":1732,"originalHeight":2057,"aspectRatio":"5:6","format":"webp","primaryFocalX":50,"primaryFocalY":40,"primaryFocalWeight":10,"primaryFocalDescription":"Child engaged in self-directed learning","secondaryFocalX":35,"secondaryFocalY":55,"secondaryFocalWeight":8,"secondaryFocalDescription":"Independent material work","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Child engaged in self-directed learning at Spicebush Montessori School","seoKeywords":["concentration","individual work","independence","focus","self-directed"],"contextualDescription":"Child engaged in self-directed learning","usedOn":[],"primaryUse":"Self-paced learning showcase","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["individual-work","focused-space","learning-atmosphere"],"lighting":"natural","activity":"self-directed study","setting":"classroom","season":"spring","quality":"medium","isRecent":false,"priority":false,"body":"# Self-Paced Individual Learning\n\nThis tall-format image captures the essence of self-paced learning, showing a child working at their own rhythm with chosen materials.\n\n## Visual Analysis\n- **Emotional Impact**: Personal agency, focused determination\n- **Educational Content**: Self-paced progress, individual timing\n- **Composition**: Vertical emphasis on individual workspace\n- **Pace**: Child working at personal speed\n\n## Usage Guidelines\n- **Primary Use**: Self-paced learning benefits\n- **Secondary Use**: Individual development respect\n- **Focal Point**: Child''s personalized work approach\n- **Message**: Shows respect for individual pace"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'individual-montessori-concentration-img-7803-1483x1977',
  'individual-montessori-concentration-img-7803-1483x1977',
  '{"originalFilename":"IMG_7803.png","optimizedFilename":"individual-montessori-concentration-img-7803-1483x1977.webp","category":"individual","originalWidth":1483,"originalHeight":1977,"aspectRatio":"3:4","format":"webp","primaryFocalX":55,"primaryFocalY":45,"primaryFocalWeight":10,"primaryFocalDescription":"Child engaged in self-directed learning","secondaryFocalX":30,"secondaryFocalY":40,"secondaryFocalWeight":8,"secondaryFocalDescription":"Focused individual activity","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Child engaged in self-directed learning at Spicebush Montessori School","seoKeywords":["concentration","individual work","independence","focus","self-directed"],"contextualDescription":"Child engaged in self-directed learning","usedOn":[],"primaryUse":"Individual learning journey","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["self-directed","focused-learning","individual-space"],"lighting":"natural","activity":"independent work","setting":"classroom","season":"spring","quality":"medium","isRecent":false,"priority":false,"body":"# Self-Directed Learning Journey\n\nThis image beautifully captures a child on their individual learning journey, showcasing the independence and self-direction that Montessori education fosters.\n\n## Visual Analysis\n- **Emotional Impact**: Independence, self-confidence, focus\n- **Educational Content**: Autonomous learning, personal growth\n- **Composition**: Vertical format showing complete work setup\n- **Journey**: Child navigating own learning path\n\n## Usage Guidelines\n- **Primary Use**: Individual learning pathways\n- **Secondary Use**: Independence development\n- **Focal Point**: Child''s self-directed engagement\n- **Message**: Illustrates personalized learning journey"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'individual-montessori-concentration-img-7893-1304x1738',
  'individual-montessori-concentration-img-7893-1304x1738',
  '{"originalFilename":"IMG_7893.png","optimizedFilename":"individual-montessori-concentration-img-7893-1304x1738.webp","category":"individual","originalWidth":1304,"originalHeight":1738,"aspectRatio":"3:4","format":"webp","primaryFocalX":45,"primaryFocalY":35,"primaryFocalWeight":10,"primaryFocalDescription":"Child deeply concentrated on individual work","secondaryFocalX":60,"secondaryFocalY":50,"secondaryFocalWeight":8,"secondaryFocalDescription":"Hands-on individual learning","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Child deeply concentrated on individual work at Spicebush Montessori School","seoKeywords":["concentration","individual work","independence","focus","self-directed"],"contextualDescription":"Child deeply concentrated on individual work","usedOn":[],"primaryUse":"Deep concentration examples","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["deep-focus","quiet-work","individual-concentration"],"lighting":"natural","activity":"concentrated work","setting":"classroom","season":"spring","quality":"medium","isRecent":false,"priority":false,"body":"# Deep Individual Focus\n\nThis compelling image captures the essence of deep concentration, showing a child completely absorbed in individual work within the Montessori environment.\n\n## Visual Analysis\n- **Emotional Impact**: Intense focus, complete absorption\n- **Educational Content**: Concentration development, deep learning\n- **Composition**: Vertical framing emphasizing focused work\n- **State**: Child in state of deep concentration\n\n## Usage Guidelines\n- **Primary Use**: Concentration development documentation\n- **Secondary Use**: Individual work benefits\n- **Focal Point**: Child''s absorbed expression and posture\n- **Message**: Demonstrates deep learning states"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'individual-montessori-concentration-img-7895-1503x2004',
  'individual-montessori-concentration-img-7895-1503x2004',
  '{"originalFilename":"IMG_7895.png","optimizedFilename":"individual-montessori-concentration-img-7895-1503x2004.webp","category":"individual","originalWidth":1503,"originalHeight":2004,"aspectRatio":"3:4","format":"webp","primaryFocalX":50,"primaryFocalY":40,"primaryFocalWeight":10,"primaryFocalDescription":"Child engaged in self-directed learning","secondaryFocalX":35,"secondaryFocalY":55,"secondaryFocalWeight":8,"secondaryFocalDescription":"Independent work process","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Child engaged in self-directed learning at Spicebush Montessori School","seoKeywords":["concentration","individual work","independence","focus","self-directed"],"contextualDescription":"Child engaged in self-directed learning","usedOn":[],"primaryUse":"Self-directed learning process","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["independent-work","focused-atmosphere","learning-light"],"lighting":"natural","activity":"independent study","setting":"classroom","season":"spring","quality":"medium","isRecent":false,"priority":false,"body":"# Independent Learning Process\n\nThis thoughtful image showcases a child working independently, demonstrating the self-motivation and focus that Montessori education nurtures.\n\n## Visual Analysis\n- **Emotional Impact**: Self-reliance, concentration, purpose\n- **Educational Content**: Independent problem-solving, self-pacing\n- **Composition**: Vertical format emphasizing individual space\n- **Process**: Child managing own learning journey\n\n## Usage Guidelines\n- **Primary Use**: Independent learning methodology\n- **Secondary Use**: Self-paced education benefits\n- **Focal Point**: Child''s self-directed activity\n- **Message**: Shows autonomous learning in action"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'individual-montessori-concentration-img-7919-1508x2010',
  'individual-montessori-concentration-img-7919-1508x2010',
  '{"originalFilename":"IMG_7919.png","optimizedFilename":"individual-montessori-concentration-img-7919-1508x2010.webp","category":"individual","originalWidth":1508,"originalHeight":2010,"aspectRatio":"3:4","format":"webp","primaryFocalX":55,"primaryFocalY":45,"primaryFocalWeight":10,"primaryFocalDescription":"Child engaged in self-directed learning","secondaryFocalX":30,"secondaryFocalY":40,"secondaryFocalWeight":8,"secondaryFocalDescription":"Deep concentration on task","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Child engaged in self-directed learning at Spicebush Montessori School","seoKeywords":["concentration","individual work","independence","focus","self-directed"],"contextualDescription":"Child engaged in self-directed learning","usedOn":[],"primaryUse":"Individual concentration showcase","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["focused-work","individual-space","concentrated-light"],"lighting":"natural","activity":"independent learning","setting":"classroom","season":"spring","quality":"medium","isRecent":false,"priority":false,"body":"# Engaged Individual Learning\n\nThis vertical image captures a child deeply engaged in individual work, exemplifying the self-directed learning that is central to Montessori education.\n\n## Visual Analysis\n- **Emotional Impact**: Focus, determination, independence\n- **Educational Content**: Self-paced learning, personal mastery\n- **Composition**: Portrait orientation emphasizing individual work\n- **Concentration**: Visible absorption in chosen activity\n\n## Usage Guidelines\n- **Primary Use**: Individual work cycle documentation\n- **Secondary Use**: Concentration development examples\n- **Focal Point**: Child''s engaged, focused work\n- **Message**: Illustrates self-directed learning process"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'individual-montessori-concentration-img-8832-1497x1296',
  'individual-montessori-concentration-img-8832-1497x1296',
  '{"originalFilename":"IMG_8832.png","optimizedFilename":"individual-montessori-concentration-img-8832-1497x1296.webp","category":"individual","originalWidth":1497,"originalHeight":1296,"aspectRatio":"19:16","format":"webp","primaryFocalX":45,"primaryFocalY":35,"primaryFocalWeight":10,"primaryFocalDescription":"Child engaged in self-directed learning","secondaryFocalX":60,"secondaryFocalY":50,"secondaryFocalWeight":8,"secondaryFocalDescription":"Independent material work","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Child engaged in self-directed learning at Spicebush Montessori School","seoKeywords":["concentration","individual work","independence","focus","self-directed"],"contextualDescription":"Child engaged in self-directed learning","usedOn":[],"primaryUse":"Self-directed learning examples","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["individual-focus","quiet-concentration","learning-space"],"lighting":"natural","activity":"self-directed work","setting":"classroom","season":"spring","quality":"medium","isRecent":true,"priority":false,"body":"# Self-Directed Learning\n\nThis horizontal image beautifully captures a child engaged in self-directed learning, demonstrating the independence fostered by the Montessori approach.\n\n## Visual Analysis\n- **Emotional Impact**: Independence, self-motivation, confidence\n- **Educational Content**: Autonomous learning, material mastery\n- **Composition**: Wide format showing complete work setup\n- **Engagement**: Child fully absorbed in chosen activity\n\n## Usage Guidelines\n- **Primary Use**: Independent learning philosophy\n- **Secondary Use**: Self-directed work examples\n- **Focal Point**: Child working independently\n- **Message**: Shows self-motivated learning in action"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'individual-montessori-concentration-img-9687-1585x1704',
  'individual-montessori-concentration-img-9687-1585x1704',
  '{"originalFilename":"IMG_9687.png","optimizedFilename":"individual-montessori-concentration-img-9687-1585x1704.webp","category":"individual","originalWidth":1585,"originalHeight":1704,"aspectRatio":"15:16","format":"webp","primaryFocalX":50,"primaryFocalY":40,"primaryFocalWeight":10,"primaryFocalDescription":"Focused concentration during work time","secondaryFocalX":35,"secondaryFocalY":55,"secondaryFocalWeight":8,"secondaryFocalDescription":"Self-directed learning activity","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Focused concentration during work time at Spicebush Montessori School","seoKeywords":["concentration","individual work","independence","focus","self-directed"],"contextualDescription":"Focused concentration during work time","usedOn":[],"primaryUse":"Individual learning showcase","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["concentrated-focus","quiet-work","individual-space"],"lighting":"natural","activity":"independent work","setting":"classroom","season":"fall","quality":"medium","isRecent":true,"priority":false,"body":"# Deep Individual Concentration\n\nThis powerful image captures a moment of deep concentration, showcasing the focused attention that characterizes individual work in the Montessori environment.\n\n## Visual Analysis\n- **Emotional Impact**: Deep focus, absorption, independence\n- **Educational Content**: Concentration development, self-direction\n- **Composition**: Nearly square format emphasizing focus\n- **Expression**: Complete engagement with chosen work\n\n## Usage Guidelines\n- **Primary Use**: Concentration and focus documentation\n- **Secondary Use**: Individual work cycle examples\n- **Focal Point**: Child''s concentrated expression\n- **Message**: Demonstrates deep learning engagement"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'materials-montessori-montessori-materials-img-6678-1499x1814',
  'materials-montessori-montessori-materials-img-6678-1499x1814',
  '{"originalFilename":"IMG_6678.png","optimizedFilename":"materials-montessori-montessori-materials-img-6678-1499x1814.webp","category":"materials","originalWidth":1499,"originalHeight":1814,"aspectRatio":"5:6","format":"webp","primaryFocalX":55,"primaryFocalY":45,"primaryFocalWeight":10,"primaryFocalDescription":"Hands-on learning with mathematical manipulatives","secondaryFocalX":40,"secondaryFocalY":30,"secondaryFocalWeight":8,"secondaryFocalDescription":"Organized mathematical materials","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Hands-on learning with mathematical manipulatives at Spicebush Montessori School","seoKeywords":["montessori materials","hands-on learning","concentration","sensorial","manipulatives"],"contextualDescription":"Hands-on learning with mathematical manipulatives","usedOn":[],"primaryUse":"Mathematics materials showcase","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["mathematical-materials","organized-beads","learning-colors"],"lighting":"natural","activity":"mathematical exploration","setting":"classroom","season":"winter","quality":"medium","isRecent":false,"priority":false,"body":"# Mathematical Material Exploration\n\nThis detailed image captures hands-on mathematical learning, showing how abstract concepts become concrete through carefully designed Montessori materials.\n\n## Visual Analysis\n- **Emotional Impact**: Discovery, mathematical understanding\n- **Educational Content**: Concrete mathematics, numerical concepts\n- **Composition**: Close focus on mathematical materials\n- **Materials**: Classic Montessori math manipulatives\n\n## Usage Guidelines\n- **Primary Use**: Mathematics program documentation\n- **Secondary Use**: Concrete learning methodology\n- **Focal Point**: Hands manipulating math materials\n- **Message**: Mathematics made tangible and accessible"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'materials-montessori-montessori-materials-img-6703-1400x1763',
  'materials-montessori-montessori-materials-img-6703-1400x1763',
  '{"originalFilename":"IMG_6703.png","optimizedFilename":"materials-montessori-montessori-materials-img-6703-1400x1763.webp","category":"materials","originalWidth":1400,"originalHeight":1763,"aspectRatio":"4:5","format":"webp","primaryFocalX":50,"primaryFocalY":50,"primaryFocalWeight":10,"primaryFocalDescription":"Practical life materials in use","secondaryFocalX":35,"secondaryFocalY":35,"secondaryFocalWeight":8,"secondaryFocalDescription":"Fine motor skill development","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Practical life materials in use at Spicebush Montessori School","seoKeywords":["montessori materials","hands-on learning","concentration","sensorial","manipulatives"],"contextualDescription":"Practical life materials in use","usedOn":[],"primaryUse":"Practical life curriculum section","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["practical-materials","natural-elements","working-hands"],"lighting":"natural","activity":"practical life work","setting":"classroom","season":"winter","quality":"medium","isRecent":false,"priority":false,"body":"# Practical Life Materials\n\nThis image showcases practical life materials in action, demonstrating how everyday activities become learning opportunities for developing coordination and independence.\n\n## Visual Analysis\n- **Emotional Impact**: Purposeful activity, real-world connection\n- **Educational Content**: Practical skills, fine motor development\n- **Composition**: Focus on hands and practical materials\n- **Materials**: Real-life objects adapted for learning\n\n## Usage Guidelines\n- **Primary Use**: Practical life curriculum pages\n- **Secondary Use**: Fine motor development showcase\n- **Focal Point**: Hands working with practical materials\n- **Message**: Shows connection to real-world skills"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'materials-montessori-montessori-materials-img-6935-1343x1790',
  'materials-montessori-montessori-materials-img-6935-1343x1790',
  '{"originalFilename":"IMG_6935.png","optimizedFilename":"materials-montessori-montessori-materials-img-6935-1343x1790.webp","category":"materials","originalWidth":1343,"originalHeight":1790,"aspectRatio":"3:4","format":"webp","primaryFocalX":55,"primaryFocalY":45,"primaryFocalWeight":10,"primaryFocalDescription":"Child concentrating on material work","secondaryFocalX":40,"secondaryFocalY":30,"secondaryFocalWeight":8,"secondaryFocalDescription":"Hands-on material exploration","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Child concentrating on material work at Spicebush Montessori School","seoKeywords":["montessori materials","hands-on learning","concentration","sensorial","manipulatives"],"contextualDescription":"Child concentrating on material work","usedOn":[],"primaryUse":"Concentration and focus showcase","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["concentrated-tones","material-colors","soft-lighting"],"lighting":"natural","activity":"focused material work","setting":"classroom","season":"winter","quality":"medium","isRecent":false,"priority":false,"body":"# Deep Concentration with Materials\n\nThis powerful image captures a moment of deep concentration as a child works with Montessori materials, exemplifying the focused attention these materials naturally foster.\n\n## Visual Analysis\n- **Emotional Impact**: Intense focus, absorbed learning\n- **Educational Content**: Concentration development, material mastery\n- **Composition**: Close view emphasizing concentration\n- **Expression**: Complete absorption in the task\n\n## Usage Guidelines\n- **Primary Use**: Concentration development pages\n- **Secondary Use**: Material work documentation\n- **Focal Point**: Child''s concentrated expression\n- **Message**: Demonstrates deep learning engagement"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'materials-montessori-montessori-materials-img-6998-1510x2013',
  'materials-montessori-montessori-materials-img-6998-1510x2013',
  '{"originalFilename":"IMG_6998.png","optimizedFilename":"materials-montessori-montessori-materials-img-6998-1510x2013.webp","category":"materials","originalWidth":1510,"originalHeight":2013,"aspectRatio":"3:4","format":"webp","primaryFocalX":45,"primaryFocalY":40,"primaryFocalWeight":10,"primaryFocalDescription":"Child working with Montessori sensorial materials","secondaryFocalX":60,"secondaryFocalY":55,"secondaryFocalWeight":8,"secondaryFocalDescription":"Sensorial material exploration","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Child working with Montessori sensorial materials at Spicebush Montessori School","seoKeywords":["montessori materials","hands-on learning","concentration","sensorial","manipulatives"],"contextualDescription":"Child working with Montessori sensorial materials","usedOn":[],"primaryUse":"Sensorial education pages","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["warm-materials","focused-work","classroom-tones"],"lighting":"natural","activity":"sensorial exploration","setting":"classroom","season":"winter","quality":"medium","isRecent":false,"priority":false,"body":"# Focused Sensorial Work\n\nThis intimate image captures a child deeply engaged with sensorial materials, demonstrating the concentration and precision that Montessori materials naturally inspire.\n\n## Visual Analysis\n- **Emotional Impact**: Deep focus, sensory engagement\n- **Educational Content**: Sensorial discrimination, fine motor control\n- **Composition**: Vertical framing emphasizing concentration\n- **Materials**: Classic sensorial learning materials\n\n## Usage Guidelines\n- **Primary Use**: Sensorial area documentation\n- **Secondary Use**: Concentration development examples\n- **Focal Point**: Child''s focused work with materials\n- **Message**: Illustrates deep sensorial engagement"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'materials-montessori-montessori-materials-img-7149-1666x1250',
  'materials-montessori-montessori-materials-img-7149-1666x1250',
  '{"originalFilename":"IMG_7149.png","optimizedFilename":"materials-montessori-montessori-materials-img-7149-1666x1250.webp","category":"materials","originalWidth":1666,"originalHeight":1250,"aspectRatio":"4:3","format":"webp","primaryFocalX":50,"primaryFocalY":50,"primaryFocalWeight":10,"primaryFocalDescription":"Hands-on learning with mathematical manipulatives","secondaryFocalX":35,"secondaryFocalY":35,"secondaryFocalWeight":8,"secondaryFocalDescription":"Mathematical material organization","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Hands-on learning with mathematical manipulatives at Spicebush Montessori School","seoKeywords":["montessori materials","hands-on learning","concentration","sensorial","manipulatives"],"contextualDescription":"Hands-on learning with mathematical manipulatives","usedOn":[],"primaryUse":"Mathematics curriculum showcase","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["mathematical-blues","counting-beads","organized-layout"],"lighting":"natural","activity":"mathematical work","setting":"classroom","season":"spring","quality":"medium","isRecent":false,"priority":false,"body":"# Mathematical Manipulatives\n\nThis image showcases the concrete nature of mathematical learning in Montessori education, with hands-on materials making abstract concepts tangible and understandable.\n\n## Visual Analysis\n- **Emotional Impact**: Engaged learning, mathematical discovery\n- **Educational Content**: Concrete mathematics, counting, patterns\n- **Composition**: Horizontal view of mathematical work\n- **Materials**: Classic Montessori math manipulatives\n\n## Usage Guidelines\n- **Primary Use**: Mathematics curriculum section\n- **Secondary Use**: Concrete learning examples\n- **Focal Point**: Hands manipulating mathematical materials\n- **Message**: Shows mathematics made concrete"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'materials-montessori-montessori-materials-img-7417-1364x1818',
  'materials-montessori-montessori-materials-img-7417-1364x1818',
  '{"originalFilename":"IMG_7417.png","optimizedFilename":"materials-montessori-montessori-materials-img-7417-1364x1818.webp","category":"materials","originalWidth":1364,"originalHeight":1818,"aspectRatio":"3:4","format":"webp","primaryFocalX":55,"primaryFocalY":45,"primaryFocalWeight":10,"primaryFocalDescription":"Child working with Montessori sensorial materials","secondaryFocalX":40,"secondaryFocalY":30,"secondaryFocalWeight":8,"secondaryFocalDescription":"Organized material presentation","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Child working with Montessori sensorial materials at Spicebush Montessori School","seoKeywords":["montessori materials","hands-on learning","concentration","sensorial","manipulatives"],"contextualDescription":"Child working with Montessori sensorial materials","usedOn":[],"primaryUse":"Sensorial development section","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["wood-tones","material-colors","soft-light"],"lighting":"natural","activity":"sensorial discrimination","setting":"classroom","season":"spring","quality":"medium","isRecent":false,"priority":false,"body":"# Sensorial Development Work\n\nThis image beautifully captures the essence of sensorial education, showing a child engaged with materials designed to refine the senses and develop discrimination abilities.\n\n## Visual Analysis\n- **Emotional Impact**: Concentration, careful manipulation\n- **Educational Content**: Sensorial refinement, order\n- **Composition**: Vertical emphasis on precise work\n- **Materials**: Traditional Montessori sensorial materials\n\n## Usage Guidelines\n- **Primary Use**: Sensorial curriculum pages\n- **Secondary Use**: Fine motor skill development\n- **Focal Point**: Precise hand movements with materials\n- **Message**: Illustrates sensorial education principles"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'materials-montessori-montessori-materials-img-8781-2113x1518',
  'materials-montessori-montessori-materials-img-8781-2113x1518',
  '{"originalFilename":"IMG_8781.png","optimizedFilename":"materials-montessori-montessori-materials-img-8781-2113x1518.webp","category":"materials","originalWidth":2113,"originalHeight":1518,"aspectRatio":"7:5","format":"webp","primaryFocalX":45,"primaryFocalY":40,"primaryFocalWeight":10,"primaryFocalDescription":"Child working with Montessori sensorial materials","secondaryFocalX":60,"secondaryFocalY":55,"secondaryFocalWeight":8,"secondaryFocalDescription":"Sensorial material manipulation","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Child working with Montessori sensorial materials at Spicebush Montessori School","seoKeywords":["montessori materials","hands-on learning","concentration","sensorial","manipulatives"],"contextualDescription":"Child working with Montessori sensorial materials","usedOn":[],"primaryUse":"Sensorial curriculum showcase","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["natural-wood","primary-colors","focused-light"],"lighting":"natural","activity":"sensorial work","setting":"classroom","season":"spring","quality":"high","isRecent":true,"priority":false,"body":"# Sensorial Material Exploration\n\nThis detailed image captures a child deeply engaged with Montessori sensorial materials, demonstrating the hands-on nature of learning through manipulation and exploration.\n\n## Visual Analysis\n- **Emotional Impact**: Deep concentration, tactile engagement\n- **Educational Content**: Sensorial development, fine motor skills\n- **Composition**: Close focus on hands and materials\n- **Materials**: Classic Montessori sensorial equipment\n\n## Usage Guidelines\n- **Primary Use**: Sensorial curriculum explanation\n- **Secondary Use**: Hands-on learning methodology\n- **Focal Point**: Child''s focused manipulation of materials\n- **Message**: Demonstrates concrete learning through senses"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'materials-montessori-montessori-materials-img-9103-1350x1800',
  'materials-montessori-montessori-materials-img-9103-1350x1800',
  '{"originalFilename":"IMG_9103.png","optimizedFilename":"materials-montessori-montessori-materials-img-9103-1350x1800.webp","category":"materials","originalWidth":1350,"originalHeight":1800,"aspectRatio":"3:4","format":"webp","primaryFocalX":50,"primaryFocalY":50,"primaryFocalWeight":10,"primaryFocalDescription":"Child working with Montessori sensorial materials","secondaryFocalX":35,"secondaryFocalY":35,"secondaryFocalWeight":8,"secondaryFocalDescription":"Detailed view of sensorial materials","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Child working with Montessori sensorial materials at Spicebush Montessori School","seoKeywords":["montessori materials","hands-on learning","concentration","sensorial","manipulatives"],"contextualDescription":"Child working with Montessori sensorial materials","usedOn":[],"primaryUse":"Material exploration showcase","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["material-colors","natural-tones","focused-work"],"lighting":"natural","activity":"sensorial exploration","setting":"classroom","season":"fall","quality":"medium","isRecent":true,"priority":false,"body":"# Sensorial Material Work\n\nThis engaging image shows a child absorbed in sensorial work, highlighting the self-correcting nature of Montessori materials and their role in developing discrimination skills.\n\n## Visual Analysis\n- **Emotional Impact**: Focus, discovery, sensory engagement\n- **Educational Content**: Sensorial discrimination, pattern recognition\n- **Composition**: Vertical framing emphasizing concentration\n- **Materials**: Classic sensorial Montessori materials\n\n## Usage Guidelines\n- **Primary Use**: Sensorial area documentation\n- **Secondary Use**: Concentration and focus examples\n- **Focal Point**: Child''s engaged interaction with materials\n- **Message**: Shows deep sensorial exploration"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'outdoor-montessori-outdoor-education-img-6278-1395x1860',
  'outdoor-montessori-outdoor-education-img-6278-1395x1860',
  '{"originalFilename":"IMG_6278.png","optimizedFilename":"outdoor-montessori-outdoor-education-img-6278-1395x1860.webp","category":"outdoor","originalWidth":1395,"originalHeight":1860,"aspectRatio":"3:4","format":"webp","primaryFocalX":50,"primaryFocalY":40,"primaryFocalWeight":10,"primaryFocalDescription":"Children exploring nature in outdoor classroom","secondaryFocalX":30,"secondaryFocalY":60,"secondaryFocalWeight":8,"secondaryFocalDescription":"Winter outdoor learning environment","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Children exploring nature in the outdoor classroom at Spicebush Montessori School","seoKeywords":["outdoor education","nature","playground","gross motor","fresh air"],"contextualDescription":"Children exploring nature in the outdoor classroom","usedOn":[],"primaryUse":"Year-round outdoor education section","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":false,"dominantColors":["winter-tones","natural-colors","outdoor-light"],"lighting":"natural","activity":"outdoor exploration","setting":"outdoor classroom","season":"winter","quality":"medium","isRecent":false,"priority":false,"body":"# Year-Round Outdoor Learning\n\nThis image demonstrates Spicebush Montessori''s commitment to outdoor education throughout all seasons, showing children engaged with nature even in winter months.\n\n## Visual Analysis\n- **Emotional Impact**: Resilience, year-round engagement, adventure\n- **Educational Content**: Seasonal learning, weather observation\n- **Composition**: Children active in winter outdoor setting\n- **Environment**: All-weather outdoor classroom usage\n\n## Usage Guidelines\n- **Primary Use**: Year-round program information\n- **Secondary Use**: Outdoor education philosophy\n- **Focal Point**: Children''s engagement regardless of season\n- **Message**: Learning happens in all weather conditions"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'outdoor-montessori-outdoor-education-img-7380-1470x1870',
  'outdoor-montessori-outdoor-education-img-7380-1470x1870',
  '{"originalFilename":"IMG_7380.png","optimizedFilename":"outdoor-montessori-outdoor-education-img-7380-1470x1870.webp","category":"outdoor","originalWidth":1470,"originalHeight":1870,"aspectRatio":"4:5","format":"webp","primaryFocalX":45,"primaryFocalY":35,"primaryFocalWeight":10,"primaryFocalDescription":"Children exploring nature in outdoor classroom","secondaryFocalX":70,"secondaryFocalY":50,"secondaryFocalWeight":8,"secondaryFocalDescription":"Natural elements and discoveries","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Children exploring nature in the outdoor classroom at Spicebush Montessori School","seoKeywords":["outdoor education","nature","playground","gross motor","fresh air"],"contextualDescription":"Children exploring nature in the outdoor classroom","usedOn":[],"primaryUse":"Outdoor curriculum showcase","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":false,"dominantColors":["spring-green","natural-brown","bright-outdoor"],"lighting":"natural","activity":"nature exploration","setting":"outdoor classroom","season":"spring","quality":"medium","isRecent":false,"priority":false,"body":"# Outdoor Classroom Exploration\n\nThis vibrant image captures children immersed in nature exploration within Spicebush Montessori''s outdoor classroom, showcasing hands-on environmental learning.\n\n## Visual Analysis\n- **Emotional Impact**: Curiosity, wonder, natural connection\n- **Educational Content**: Environmental science, observation skills\n- **Composition**: Children centered in natural environment\n- **Setting**: Outdoor classroom as extension of indoor learning\n\n## Usage Guidelines\n- **Primary Use**: Outdoor education program description\n- **Secondary Use**: Nature-based curriculum examples\n- **Focal Point**: Children''s engaged exploration of nature\n- **Message**: Learning extends beyond traditional classroom walls"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'outdoor-montessori-outdoor-education-img-8329-1563x1662',
  'outdoor-montessori-outdoor-education-img-8329-1563x1662',
  '{"originalFilename":"IMG_8329.png","optimizedFilename":"outdoor-montessori-outdoor-education-img-8329-1563x1662.webp","category":"outdoor","originalWidth":1563,"originalHeight":1662,"aspectRatio":"15:16","format":"webp","primaryFocalX":55,"primaryFocalY":45,"primaryFocalWeight":10,"primaryFocalDescription":"Outdoor gross motor development activities","secondaryFocalX":25,"secondaryFocalY":40,"secondaryFocalWeight":8,"secondaryFocalDescription":"Physical movement and coordination","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Outdoor gross motor development activities at Spicebush Montessori School","seoKeywords":["outdoor education","nature","playground","gross motor","fresh air"],"contextualDescription":"Outdoor gross motor development activities","usedOn":[],"primaryUse":"Physical development program section","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":false,"dominantColors":["outdoor-green","natural-light","earth-tones"],"lighting":"natural","activity":"gross motor development","setting":"outdoor space","season":"spring","quality":"medium","isRecent":true,"priority":false,"body":"# Gross Motor Development Outdoors\n\nThis energetic image showcases children engaged in gross motor activities outdoors, demonstrating the vital role of physical development in the Montessori approach.\n\n## Visual Analysis\n- **Emotional Impact**: Energy, freedom, physical confidence\n- **Educational Content**: Gross motor skills, coordination, balance\n- **Composition**: Dynamic movement in natural setting\n- **Activity**: Full-body engagement and development\n\n## Usage Guidelines\n- **Primary Use**: Physical development program pages\n- **Secondary Use**: Outdoor education benefits section\n- **Focal Point**: Children''s active physical engagement\n- **Message**: Emphasizes holistic development including physical skills"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'outdoor-montessori-outdoor-education-img-9428-1310x1746',
  'outdoor-montessori-outdoor-education-img-9428-1310x1746',
  '{"originalFilename":"IMG_9428.png","optimizedFilename":"outdoor-montessori-outdoor-education-img-9428-1310x1746.webp","category":"outdoor","originalWidth":1310,"originalHeight":1746,"aspectRatio":"3:4","format":"webp","primaryFocalX":50,"primaryFocalY":40,"primaryFocalWeight":10,"primaryFocalDescription":"Children exploring nature in outdoor classroom","secondaryFocalX":30,"secondaryFocalY":60,"secondaryFocalWeight":8,"secondaryFocalDescription":"Natural environment and outdoor elements","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Children exploring nature in the outdoor classroom at Spicebush Montessori School","seoKeywords":["outdoor education","nature","playground","gross motor","fresh air"],"contextualDescription":"Children exploring nature in the outdoor classroom","usedOn":[],"primaryUse":"Gallery outdoor education section","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":false,"dominantColors":["natural-green","earth-brown","sky-blue"],"lighting":"natural","activity":"outdoor exploration","setting":"outdoor classroom","season":"fall","quality":"medium","isRecent":true,"priority":false,"body":"# Outdoor Nature Exploration\n\nThis image captures children actively exploring nature in Spicebush Montessori''s outdoor classroom, demonstrating the school''s commitment to connecting children with the natural world.\n\n## Visual Analysis\n- **Emotional Impact**: Joy, curiosity, freedom of movement\n- **Educational Content**: Nature exploration, gross motor development\n- **Composition**: Natural elements frame children''s exploration\n- **Environment**: Outdoor classroom with natural materials\n\n## Usage Guidelines\n- **Primary Use**: Outdoor education program pages\n- **Secondary Use**: Gallery showcasing nature-based learning\n- **Focal Point**: Children''s engagement with natural environment\n- **Message**: Emphasizes outdoor learning and connection with nature"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'outdoor-montessori-outdoor-education-img-9472-1353x1862',
  'outdoor-montessori-outdoor-education-img-9472-1353x1862',
  '{"originalFilename":"IMG_9472.png","optimizedFilename":"outdoor-montessori-outdoor-education-img-9472-1353x1862.webp","category":"outdoor","originalWidth":1353,"originalHeight":1862,"aspectRatio":"3:4","format":"webp","primaryFocalX":55,"primaryFocalY":45,"primaryFocalWeight":10,"primaryFocalDescription":"Students engaged in playground activities","secondaryFocalX":25,"secondaryFocalY":40,"secondaryFocalWeight":8,"secondaryFocalDescription":"Playground equipment and outdoor space","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Students engaged in playground activities at Spicebush Montessori School","seoKeywords":["outdoor education","nature","playground","gross motor","fresh air"],"contextualDescription":"Students engaged in playground activities","usedOn":[],"primaryUse":"Programs outdoor activities section","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":false,"dominantColors":["playground-colors","natural-green","sky-blue"],"lighting":"natural","activity":"playground activities","setting":"outdoor playground","season":"fall","quality":"medium","isRecent":true,"priority":false,"body":"# Active Playground Learning\n\nThis dynamic image showcases students engaged in playground activities, highlighting the importance of gross motor development and outdoor play in the Montessori curriculum.\n\n## Visual Analysis\n- **Emotional Impact**: Energy, joy, physical engagement\n- **Educational Content**: Gross motor skills, social interaction\n- **Composition**: Action captured in natural outdoor setting\n- **Movement**: Dynamic play and physical development\n\n## Usage Guidelines\n- **Primary Use**: Outdoor program information pages\n- **Secondary Use**: Gallery of active learning experiences\n- **Focal Point**: Students'' active engagement in play\n- **Message**: Demonstrates importance of physical development"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'outdoor-montessori-outdoor-education-img-9493-1729x1297',
  'outdoor-montessori-outdoor-education-img-9493-1729x1297',
  '{"originalFilename":"IMG_9493.png","optimizedFilename":"outdoor-montessori-outdoor-education-img-9493-1729x1297.webp","category":"outdoor","originalWidth":1729,"originalHeight":1297,"aspectRatio":"4:3","format":"webp","primaryFocalX":50,"primaryFocalY":40,"primaryFocalWeight":10,"primaryFocalDescription":"Nature-based learning experience","secondaryFocalX":30,"secondaryFocalY":60,"secondaryFocalWeight":8,"secondaryFocalDescription":"Natural environment and materials","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Nature-based learning experience at Spicebush Montessori School","seoKeywords":["outdoor education","nature","playground","gross motor","fresh air"],"contextualDescription":"Nature-based learning experience","usedOn":[],"primaryUse":"Nature education program section","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":false,"dominantColors":["natural-green","earth-tones","outdoor-light"],"lighting":"natural","activity":"nature exploration","setting":"outdoor classroom","season":"fall","quality":"medium","isRecent":true,"priority":false,"body":"# Nature-Based Learning Experience\n\nThis image beautifully captures the essence of nature-based learning at Spicebush Montessori, where children connect with the natural world as an extension of their classroom.\n\n## Visual Analysis\n- **Emotional Impact**: Wonder, discovery, connection with nature\n- **Educational Content**: Environmental education, sensory exploration\n- **Composition**: Natural elements integrated with learning\n- **Environment**: Outdoor classroom as learning laboratory\n\n## Usage Guidelines\n- **Primary Use**: Nature education and outdoor programs\n- **Secondary Use**: Environmental curriculum showcase\n- **Focal Point**: Children''s interaction with natural materials\n- **Message**: Highlights nature as teacher and classroom"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'practical-montessori-practical-life-img-4415-1453x1937',
  'practical-montessori-practical-life-img-4415-1453x1937',
  '{"originalFilename":"IMG_4415.png","optimizedFilename":"practical-montessori-practical-life-img-4415-1453x1937.webp","category":"practical","originalWidth":1453,"originalHeight":1937,"aspectRatio":"3:4","format":"webp","primaryFocalX":50,"primaryFocalY":40,"primaryFocalWeight":10,"primaryFocalDescription":"Care of environment activities","secondaryFocalX":35,"secondaryFocalY":55,"secondaryFocalWeight":8,"secondaryFocalDescription":"Contributing to classroom community","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Care of environment activities at Spicebush Montessori School","seoKeywords":["practical life","life skills","pouring","food preparation","real world"],"contextualDescription":"Care of environment activities","usedOn":[],"primaryUse":"Community care showcase","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["care-activities","community-work","environmental-responsibility"],"lighting":"natural","activity":"environmental care","setting":"classroom","season":"various","quality":"medium","isRecent":false,"priority":false,"body":"# Community Environmental Care\n\nThis final practical life image demonstrates care of environment activities, showing how children contribute to their classroom community through meaningful work.\n\n## Visual Analysis\n- **Emotional Impact**: Community pride, responsibility, contribution\n- **Educational Content**: Environmental stewardship, care skills\n- **Composition**: Vertical view of care activities\n- **Purpose**: Building community through care\n\n## Usage Guidelines\n- **Primary Use**: Community contribution pages\n- **Secondary Use**: Environmental responsibility\n- **Focal Point**: Children caring for shared spaces\n- **Message**: Learning through community service"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'practical-montessori-practical-life-img-4529-1573x2097',
  'practical-montessori-practical-life-img-4529-1573x2097',
  '{"originalFilename":"IMG_4529.png","optimizedFilename":"practical-montessori-practical-life-img-4529-1573x2097.webp","category":"practical","originalWidth":1573,"originalHeight":2097,"aspectRatio":"3:4","format":"webp","primaryFocalX":55,"primaryFocalY":45,"primaryFocalWeight":10,"primaryFocalDescription":"Practical life activities developing real-world skills","secondaryFocalX":30,"secondaryFocalY":40,"secondaryFocalWeight":8,"secondaryFocalDescription":"Refining practical abilities","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Practical life activities developing real-world skills at Spicebush Montessori School","seoKeywords":["practical life","life skills","pouring","food preparation","real world"],"contextualDescription":"Practical life activities developing real-world skills","usedOn":[],"primaryUse":"Practical life exercises","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["practical-work","skill-building","real-activities"],"lighting":"natural","activity":"practical exercises","setting":"classroom","season":"various","quality":"medium","isRecent":false,"priority":false,"body":"# Practical Life Exercises\n\nThis vertical image showcases various practical life exercises, demonstrating the breadth of real-world skills developed through purposeful activities.\n\n## Visual Analysis\n- **Emotional Impact**: Accomplishment, growth, capability\n- **Educational Content**: Multiple skill areas, progression\n- **Composition**: Tall format showing complete activities\n- **Variety**: Range of practical life exercises\n\n## Usage Guidelines\n- **Primary Use**: Practical life overview\n- **Secondary Use**: Skill development range\n- **Focal Point**: Children engaged in various tasks\n- **Message**: Comprehensive life preparation"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'practical-montessori-practical-life-img-4621-1403x1809',
  'practical-montessori-practical-life-img-4621-1403x1809',
  '{"originalFilename":"IMG_4621.png","optimizedFilename":"practical-montessori-practical-life-img-4621-1403x1809.webp","category":"practical","originalWidth":1403,"originalHeight":1809,"aspectRatio":"4:5","format":"webp","primaryFocalX":45,"primaryFocalY":35,"primaryFocalWeight":10,"primaryFocalDescription":"Food preparation in the classroom","secondaryFocalX":60,"secondaryFocalY":50,"secondaryFocalWeight":8,"secondaryFocalDescription":"Step-by-step food preparation","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Food preparation in the classroom at Spicebush Montessori School","seoKeywords":["practical life","life skills","pouring","food preparation","real world"],"contextualDescription":"Food preparation in the classroom","usedOn":[],"primaryUse":"Food preparation curriculum","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["food-work","preparation-skills","real-cooking"],"lighting":"natural","activity":"food preparation","setting":"classroom","season":"various","quality":"medium","isRecent":false,"priority":false,"body":"# Classroom Food Preparation\n\nThis image captures children engaged in food preparation activities, demonstrating how practical life exercises teach valuable life skills and independence.\n\n## Visual Analysis\n- **Emotional Impact**: Purpose, real-world connection, pride\n- **Educational Content**: Cooking skills, sequence, safety\n- **Composition**: Vertical view of food preparation\n- **Process**: Following recipes and procedures\n\n## Usage Guidelines\n- **Primary Use**: Food preparation program\n- **Secondary Use**: Independence through cooking\n- **Focal Point**: Children preparing real food\n- **Message**: Learning through meaningful activities"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'practical-montessori-practical-life-img-4678-1842x1382',
  'practical-montessori-practical-life-img-4678-1842x1382',
  '{"originalFilename":"IMG_4678.png","optimizedFilename":"practical-montessori-practical-life-img-4678-1842x1382.webp","category":"practical","originalWidth":1842,"originalHeight":1382,"aspectRatio":"4:3","format":"webp","primaryFocalX":50,"primaryFocalY":40,"primaryFocalWeight":10,"primaryFocalDescription":"Practical life activities developing real-world skills","secondaryFocalX":35,"secondaryFocalY":55,"secondaryFocalWeight":8,"secondaryFocalDescription":"Mastering practical tasks","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Practical life activities developing real-world skills at Spicebush Montessori School","seoKeywords":["practical life","life skills","pouring","food preparation","real world"],"contextualDescription":"Practical life activities developing real-world skills","usedOn":[],"primaryUse":"Skill development showcase","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["practical-skills","real-tasks","competence-building"],"lighting":"natural","activity":"skill development","setting":"classroom","season":"various","quality":"medium","isRecent":false,"priority":false,"body":"# Practical Skill Development\n\nThis horizontal image showcases the development of practical skills through purposeful activities, highlighting the competence children build through real work.\n\n## Visual Analysis\n- **Emotional Impact**: Competence, mastery, confidence\n- **Educational Content**: Skill progression, task completion\n- **Composition**: Wide view of practical work\n- **Achievement**: Visible skill development\n\n## Usage Guidelines\n- **Primary Use**: Skill development documentation\n- **Secondary Use**: Practical life outcomes\n- **Focal Point**: Children demonstrating competence\n- **Message**: Building real-world capabilities"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'practical-montessori-practical-life-img-4709-1591x2121',
  'practical-montessori-practical-life-img-4709-1591x2121',
  '{"originalFilename":"IMG_4709.png","optimizedFilename":"practical-montessori-practical-life-img-4709-1591x2121.webp","category":"practical","originalWidth":1591,"originalHeight":2121,"aspectRatio":"3:4","format":"webp","primaryFocalX":55,"primaryFocalY":45,"primaryFocalWeight":10,"primaryFocalDescription":"Care of environment activities","secondaryFocalX":30,"secondaryFocalY":40,"secondaryFocalWeight":8,"secondaryFocalDescription":"Developing care skills","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Care of environment activities at Spicebush Montessori School","seoKeywords":["practical life","life skills","pouring","food preparation","real world"],"contextualDescription":"Care of environment activities","usedOn":[],"primaryUse":"Care activities showcase","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["care-work","practical-learning","environment-maintenance"],"lighting":"natural","activity":"environmental maintenance","setting":"classroom","season":"various","quality":"medium","isRecent":false,"priority":false,"body":"# Environmental Care Activities\n\nThis tall image captures children engaged in environmental care activities, demonstrating how practical life work builds both skills and community responsibility.\n\n## Visual Analysis\n- **Emotional Impact**: Pride in contribution, care, responsibility\n- **Educational Content**: Maintenance skills, environmental awareness\n- **Composition**: Vertical emphasis on care activities\n- **Community**: Contributing to shared environment\n\n## Usage Guidelines\n- **Primary Use**: Community responsibility pages\n- **Secondary Use**: Practical life benefits\n- **Focal Point**: Children maintaining their environment\n- **Message**: Learning through meaningful contribution"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'practical-montessori-practical-life-img-4959-1340x1786',
  'practical-montessori-practical-life-img-4959-1340x1786',
  '{"originalFilename":"IMG_4959.png","optimizedFilename":"practical-montessori-practical-life-img-4959-1340x1786.webp","category":"practical","originalWidth":1340,"originalHeight":1786,"aspectRatio":"3:4","format":"webp","primaryFocalX":50,"primaryFocalY":40,"primaryFocalWeight":10,"primaryFocalDescription":"Care of environment activities","secondaryFocalX":35,"secondaryFocalY":55,"secondaryFocalWeight":8,"secondaryFocalDescription":"Learning environmental care","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Care of environment activities at Spicebush Montessori School","seoKeywords":["practical life","life skills","pouring","food preparation","real world"],"contextualDescription":"Care of environment activities","usedOn":[],"primaryUse":"Environmental care curriculum","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["care-activities","environment-focus","responsible-actions"],"lighting":"natural","activity":"environmental care","setting":"classroom","season":"various","quality":"medium","isRecent":false,"priority":false,"body":"# Care of Environment\n\nThis image demonstrates care of environment activities, showing how children learn responsibility and stewardship through practical life exercises.\n\n## Visual Analysis\n- **Emotional Impact**: Responsibility, care, community contribution\n- **Educational Content**: Environmental awareness, maintenance skills\n- **Composition**: Vertical view of care activities\n- **Purpose**: Building environmental stewardship\n\n## Usage Guidelines\n- **Primary Use**: Environmental care program\n- **Secondary Use**: Responsibility development\n- **Focal Point**: Children caring for their environment\n- **Message**: Learning through environmental responsibility"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'practical-montessori-practical-life-img-5131-3024x4032',
  'practical-montessori-practical-life-img-5131-3024x4032',
  '{"originalFilename":"IMG_5131.jpg","optimizedFilename":"practical-montessori-practical-life-img-5131-3024x4032.webp","category":"practical","originalWidth":3024,"originalHeight":4032,"aspectRatio":"3:4","format":"webp","primaryFocalX":45,"primaryFocalY":35,"primaryFocalWeight":10,"primaryFocalDescription":"Food preparation in the classroom","secondaryFocalX":60,"secondaryFocalY":50,"secondaryFocalWeight":8,"secondaryFocalDescription":"Real-world skill development","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Food preparation in the classroom at Spicebush Montessori School","seoKeywords":["practical life","life skills","pouring","food preparation","real world"],"contextualDescription":"Food preparation in the classroom","usedOn":[],"primaryUse":"Practical life curriculum","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["food-prep","practical-materials","real-life"],"lighting":"natural","activity":"food preparation","setting":"classroom","season":"winter","quality":"high","isRecent":false,"priority":false,"body":"# Food Preparation Skills\n\nThis high-quality image captures children engaged in food preparation activities, demonstrating how practical life exercises connect classroom learning to real-world skills.\n\n## Visual Analysis\n- **Emotional Impact**: Purpose, real-world connection, independence\n- **Educational Content**: Life skills, food preparation, coordination\n- **Composition**: Vertical view of practical activity\n- **Skills**: Real food preparation techniques\n\n## Usage Guidelines\n- **Primary Use**: Practical life curriculum showcase\n- **Secondary Use**: Real-world skills development\n- **Focal Point**: Children preparing food independently\n- **Message**: Learning through meaningful activities"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'practical-montessori-practical-life-img-5397-1750x1313',
  'practical-montessori-practical-life-img-5397-1750x1313',
  '{"originalFilename":"IMG_5397.png","optimizedFilename":"practical-montessori-practical-life-img-5397-1750x1313.webp","category":"practical","originalWidth":1750,"originalHeight":1313,"aspectRatio":"4:3","format":"webp","primaryFocalX":50,"primaryFocalY":40,"primaryFocalWeight":10,"primaryFocalDescription":"Practical life activities developing real-world skills","secondaryFocalX":35,"secondaryFocalY":55,"secondaryFocalWeight":8,"secondaryFocalDescription":"Life skills in action","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":40,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":60,"tabletCropHeight":80,"altText":"Practical life activities developing real-world skills at Spicebush Montessori School","seoKeywords":["practical life","life skills","pouring","food preparation","real world"],"contextualDescription":"Practical life activities developing real-world skills","usedOn":[],"primaryUse":"Life skills development","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["practical-work","real-materials","skill-building"],"lighting":"natural","activity":"practical life skills","setting":"classroom","season":"winter","quality":"medium","isRecent":false,"priority":false,"body":"# Real-World Skill Development\n\nThis horizontal image showcases practical life activities that develop real-world skills, emphasizing the connection between classroom work and daily life competencies.\n\n## Visual Analysis\n- **Emotional Impact**: Competence, independence, purpose\n- **Educational Content**: Life skills, coordination, sequence\n- **Composition**: Wide view of practical activities\n- **Materials**: Real-life objects and tools\n\n## Usage Guidelines\n- **Primary Use**: Practical life philosophy pages\n- **Secondary Use**: Independence development showcase\n- **Focal Point**: Children mastering real-life tasks\n- **Message**: Education for life preparation"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'programs-montessori-bird-puzzle-zoology-science',
  'programs-montessori-bird-puzzle-zoology-science',
  '{"originalFilename":"bird-puzzle-zoology.png","optimizedFilename":"programs-montessori-bird-puzzle-zoology-science-1200x800.webp","category":"programs","originalWidth":1200,"originalHeight":800,"aspectRatio":"3:2","format":"webp","primaryFocalX":45,"primaryFocalY":40,"primaryFocalWeight":10,"primaryFocalDescription":"Child''s concentrated expression while assembling bird anatomy puzzle","secondaryFocalX":60,"secondaryFocalY":55,"secondaryFocalWeight":8,"secondaryFocalDescription":"Colorful bird puzzle showing anatomical parts","mobileCropX":30,"mobileCropY":25,"mobileCropWidth":55,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":15,"tabletCropWidth":75,"tabletCropHeight":75,"altText":"Child exploring bird anatomy through Montessori zoology puzzle, learning scientific classification and natural science","seoKeywords":["montessori science","zoology puzzle","bird anatomy","natural science","biology education","hands-on science","nature study"],"contextualDescription":"Zoology puzzles introduce scientific concepts through concrete manipulation, fostering early interest in natural sciences","usedOn":["programs-science","cultural-studies"],"primaryUse":"Science and cultural studies program","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["bright-yellow","vibrant-blue","natural-wood","soft-green"],"lighting":"natural","activity":"scientific exploration","setting":"classroom","priority":false,"compressed":true,"hasWebP":true,"hasSrcSet":true,"lazyLoad":true,"body":"# Scientific Discovery: Zoology Studies\n\nMontessori zoology materials like this bird puzzle introduce children to scientific classification and anatomy through hands-on exploration. The detailed parts teach precise vocabulary and observation skills.\n\n## Visual Analysis\n- **Emotional Impact**: Curious exploration, scientific interest\n- **Educational Content**: Animal anatomy, classification, vocabulary development\n- **Composition**: Clear view of puzzle assembly and concentration\n- **Symbolism**: Science made accessible through concrete materials\n\n## Usage Guidelines\n- **Primary Use**: Science program curriculum page\n- **Secondary Use**: Cultural studies overview\n- **Focal Point**: Child''s engagement with anatomical details\n- **Message**: Scientific learning through manipulation and discovery"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'programs-montessori-cylinder-blocks-sensorial-refinement',
  'programs-montessori-cylinder-blocks-sensorial-refinement',
  '{"originalFilename":"cylinder-blocks-sensorial.png","optimizedFilename":"programs-montessori-cylinder-blocks-sensorial-refinement-1200x800.webp","category":"programs","originalWidth":1200,"originalHeight":800,"aspectRatio":"3:2","format":"webp","primaryFocalX":50,"primaryFocalY":45,"primaryFocalWeight":10,"primaryFocalDescription":"Child''s hand carefully testing cylinder fit in block","secondaryFocalX":35,"secondaryFocalY":60,"secondaryFocalWeight":8,"secondaryFocalDescription":"Multiple cylinder blocks showing size progression","mobileCropX":35,"mobileCropY":30,"mobileCropWidth":50,"mobileCropHeight":55,"tabletCropX":20,"tabletCropY":20,"tabletCropWidth":70,"tabletCropHeight":70,"altText":"Child working with Montessori cylinder blocks, developing visual discrimination and fine motor control through sensorial exploration","seoKeywords":["cylinder blocks","sensorial materials","visual discrimination","size gradation","montessori sensorial","fine motor skills","problem solving"],"contextualDescription":"Cylinder blocks challenge children to discriminate between subtle size differences, preparing the hand for writing and the mind for mathematics","usedOn":["programs-sensorial","materials-overview"],"primaryUse":"Sensorial program curriculum showcase","hasHumanFaces":false,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["natural-wood","soft-shadows","warm-beige","gentle-browns"],"lighting":"indoor","activity":"size discrimination","setting":"classroom","priority":false,"compressed":true,"hasWebP":true,"hasSrcSet":true,"lazyLoad":true,"body":"# Sensorial Refinement: Cylinder Blocks\n\nThe cylinder blocks are quintessential Montessori materials that develop visual discrimination, problem-solving, and fine motor control. Each block presents a different challenge in size differentiation.\n\n## Visual Analysis\n- **Emotional Impact**: Deep concentration, methodical exploration\n- **Educational Content**: Size discrimination, systematic thinking, motor refinement\n- **Composition**: Multiple blocks show progression of difficulty\n- **Symbolism**: Precision and order in learning\n\n## Usage Guidelines\n- **Primary Use**: Sensorial curriculum program page\n- **Secondary Use**: Materials overview section\n- **Focal Point**: Precise hand movements testing fit\n- **Message**: Learning through systematic sensory exploration"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'programs-montessori-flower-arranging-practical-life',
  'programs-montessori-flower-arranging-practical-life',
  '{"originalFilename":"flower-arranging-practical-life.png","optimizedFilename":"programs-montessori-flower-arranging-practical-life-1200x800.webp","category":"programs","originalWidth":1200,"originalHeight":800,"aspectRatio":"3:2","format":"webp","primaryFocalX":45,"primaryFocalY":35,"primaryFocalWeight":10,"primaryFocalDescription":"Child''s hands delicately arranging flowers in vase","secondaryFocalX":60,"secondaryFocalY":45,"secondaryFocalWeight":8,"secondaryFocalDescription":"Colorful flower arrangement taking shape","mobileCropX":30,"mobileCropY":20,"mobileCropWidth":55,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":10,"tabletCropWidth":75,"tabletCropHeight":75,"altText":"Child practicing flower arranging as part of Montessori practical life curriculum, developing fine motor skills and aesthetic sense","seoKeywords":["practical life","flower arranging","montessori activities","fine motor development","aesthetic education","life skills","care of environment"],"contextualDescription":"Flower arranging combines fine motor development, aesthetic appreciation, and care for the environment in one meaningful activity","usedOn":["programs-practical-life","daily-activities"],"primaryUse":"Practical life curriculum showcase","hasHumanFaces":true,"hasChildren":true,"hasMonressoriMaterials":false,"dominantColors":["vibrant-pink","fresh-green","sunny-yellow","natural-light"],"lighting":"natural","activity":"flower arranging","setting":"classroom","priority":false,"compressed":true,"hasWebP":true,"hasSrcSet":true,"lazyLoad":true,"body":"# Practical Life: Flower Arranging\n\nFlower arranging exemplifies practical life activities that develop concentration, coordination, and care for beauty. This real-world task connects children to their environment while refining motor skills.\n\n## Visual Analysis\n- **Emotional Impact**: Gentle care, aesthetic appreciation\n- **Educational Content**: Sequential steps, fine motor control, beauty creation\n- **Composition**: Hands and flowers create focal interest\n- **Symbolism**: Bringing beauty and nature into daily life\n\n## Usage Guidelines\n- **Primary Use**: Practical life program page\n- **Secondary Use**: Daily activities showcase\n- **Focal Point**: Careful hand movements arranging flowers\n- **Message**: Real-life skills taught with intention and beauty"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'programs-montessori-moveable-alphabet-language-development',
  'programs-montessori-moveable-alphabet-language-development',
  '{"originalFilename":"moveable-alphabet-language.png","optimizedFilename":"programs-montessori-moveable-alphabet-language-development-1200x800.webp","category":"programs","originalWidth":1200,"originalHeight":800,"aspectRatio":"3:2","format":"webp","primaryFocalX":50,"primaryFocalY":55,"primaryFocalWeight":10,"primaryFocalDescription":"Small hands carefully placing letter tiles to form words","secondaryFocalX":45,"secondaryFocalY":35,"secondaryFocalWeight":8,"secondaryFocalDescription":"Clear view of word being constructed with moveable letters","mobileCropX":30,"mobileCropY":25,"mobileCropWidth":55,"mobileCropHeight":60,"tabletCropX":20,"tabletCropY":15,"tabletCropWidth":70,"tabletCropHeight":70,"altText":"Child using Montessori moveable alphabet to construct words, developing early literacy and writing skills","seoKeywords":["moveable alphabet","montessori language","early literacy","word building","phonetic learning","writing development","letter recognition"],"contextualDescription":"The moveable alphabet allows children to ''write'' before their hand control is ready for pencil work, supporting natural language development","usedOn":["programs-language","early-literacy"],"primaryUse":"Language arts program demonstration","hasHumanFaces":false,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["soft-blue","gentle-pink","natural-wood","cream-background"],"lighting":"indoor","activity":"word construction","setting":"classroom","priority":false,"compressed":true,"hasWebP":true,"hasSrcSet":true,"lazyLoad":true,"body":"# Language Expression: Moveable Alphabet\n\nThis essential Montessori language material bridges the gap between understanding language and writing it. Children can express their thoughts through word construction before mastering pencil control.\n\n## Visual Analysis\n- **Emotional Impact**: Thoughtful concentration, creative expression\n- **Educational Content**: Phonetic awareness, word building, early writing\n- **Composition**: Clear view of letter manipulation and word formation\n- **Symbolism**: Language made tangible and accessible\n\n## Usage Guidelines\n- **Primary Use**: Language arts program page\n- **Secondary Use**: Early literacy curriculum sections\n- **Focal Point**: Hands placing letters to form meaningful words\n- **Message**: Writing development respects physical readiness"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'programs-montessori-red-blue-rods-mathematical-thinking',
  'programs-montessori-red-blue-rods-mathematical-thinking',
  '{"originalFilename":"red-blue-rods-math.png","optimizedFilename":"programs-montessori-red-blue-rods-mathematical-thinking-1200x800.webp","category":"programs","originalWidth":1200,"originalHeight":800,"aspectRatio":"3:2","format":"webp","primaryFocalX":40,"primaryFocalY":50,"primaryFocalWeight":10,"primaryFocalDescription":"Child''s hands precisely arranging red and blue number rods","secondaryFocalX":60,"secondaryFocalY":40,"secondaryFocalWeight":8,"secondaryFocalDescription":"Mathematical progression visible in rod arrangement","mobileCropX":25,"mobileCropY":30,"mobileCropWidth":60,"mobileCropHeight":55,"tabletCropX":15,"tabletCropY":20,"tabletCropWidth":80,"tabletCropHeight":70,"altText":"Child working with Montessori red and blue number rods, developing mathematical concepts of quantity and sequence","seoKeywords":["montessori math","number rods","red blue rods","mathematical materials","concrete math","quantity concept","number sequence"],"contextualDescription":"Number rods provide concrete representation of quantity, allowing children to physically experience mathematical relationships","usedOn":["programs-mathematics","curriculum-overview"],"primaryUse":"Mathematics program showcase","hasHumanFaces":false,"hasChildren":true,"hasMonressoriMaterials":true,"dominantColors":["vibrant-red","bright-blue","natural-wood","soft-shadows"],"lighting":"indoor","activity":"mathematical exploration","setting":"classroom","priority":false,"compressed":true,"hasWebP":true,"hasSrcSet":true,"lazyLoad":true,"body":"# Mathematical Foundation: Number Rods\n\nThe red and blue number rods are fundamental Montessori mathematics materials. This image captures a child discovering numerical relationships through hands-on manipulation of concrete quantities.\n\n## Visual Analysis\n- **Emotional Impact**: Focused exploration, discovery\n- **Educational Content**: Quantity concepts, number sequence, visual patterns\n- **Composition**: Clear view of graduated lengths and alternating colors\n- **Symbolism**: Concrete to abstract mathematical thinking\n\n## Usage Guidelines\n- **Primary Use**: Mathematics program page\n- **Secondary Use**: Curriculum overview sections\n- **Focal Point**: Hands arranging rods in sequence\n- **Message**: Mathematics made concrete and comprehensible"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'teachers-kira-messinger-assistant-teacher',
  'teachers-kira-messinger-assistant-teacher',
  '{"originalFilename":"kira-messinger.jpg","optimizedFilename":"teachers-kira-messinger-assistant-teacher-800x800.webp","category":"teachers","originalWidth":800,"originalHeight":800,"aspectRatio":"1:1","format":"webp","primaryFocalX":50,"primaryFocalY":35,"primaryFocalWeight":10,"primaryFocalDescription":"Kira''s bright, enthusiastic expression","secondaryFocalX":50,"secondaryFocalY":60,"secondaryFocalWeight":5,"secondaryFocalDescription":"Professional educational attire","mobileCropX":20,"mobileCropY":10,"mobileCropWidth":60,"mobileCropHeight":60,"tabletCropX":10,"tabletCropY":5,"tabletCropWidth":80,"tabletCropHeight":80,"altText":"Kira Messinger, Assistant Teacher at Spicebush Montessori School, enthusiastic professional portrait","seoKeywords":["kira messinger","assistant teacher","montessori assistant","spicebush staff","teaching team","educator"],"contextualDescription":"Professional portrait of Kira Messinger, Assistant Teacher, showing enthusiasm and dedication to early childhood education","usedOn":["staff-page","programs-toddler"],"primaryUse":"Staff directory page","hasHumanFaces":true,"hasChildren":false,"hasMonressoriMaterials":false,"dominantColors":["bright-lighting","warm-smile","professional-background"],"lighting":"indoor","activity":"portrait","setting":"portrait","priority":false,"compressed":true,"hasWebP":true,"hasSrcSet":true,"lazyLoad":true,"body":"# Assistant Teacher: Kira Messinger\n\nProfessional portrait of Kira Messinger, our enthusiastic Assistant Teacher who brings energy and fresh perspectives to support children''s development.\n\n## Visual Analysis\n- **Emotional Impact**: Energetic, positive, supportive\n- **Educational Content**: Teaching team representation\n- **Composition**: Professional portrait format\n- **Symbolism**: Supportive educational partnership\n\n## Usage Guidelines\n- **Primary Use**: Staff directory page\n- **Secondary Use**: Toddler program pages\n- **Focal Point**: Bright, enthusiastic expression\n- **Message**: Energetic, supportive educator"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'teachers-kirsti-forrest-head-teacher',
  'teachers-kirsti-forrest-head-teacher',
  '{"originalFilename":"kirsti-forrest.jpg","optimizedFilename":"teachers-kirsti-forrest-head-teacher-800x800.webp","category":"teachers","originalWidth":800,"originalHeight":800,"aspectRatio":"1:1","format":"webp","primaryFocalX":50,"primaryFocalY":35,"primaryFocalWeight":10,"primaryFocalDescription":"Kirsti''s warm, welcoming expression","secondaryFocalX":50,"secondaryFocalY":60,"secondaryFocalWeight":5,"secondaryFocalDescription":"Professional presentation","mobileCropX":20,"mobileCropY":10,"mobileCropWidth":60,"mobileCropHeight":60,"tabletCropX":10,"tabletCropY":5,"tabletCropWidth":80,"tabletCropHeight":80,"altText":"Kirsti Forrest, Head Teacher at Spicebush Montessori School, warm professional portrait","seoKeywords":["kirsti forrest","head teacher","montessori teacher","spicebush staff","lead educator","school leadership"],"contextualDescription":"Professional portrait of Kirsti Forrest, Head Teacher, showing warmth and approachability","usedOn":["staff-page","about-leadership"],"primaryUse":"Staff directory page","hasHumanFaces":true,"hasChildren":false,"hasMonressoriMaterials":false,"dominantColors":["professional-attire","warm-lighting","neutral-background"],"lighting":"indoor","activity":"portrait","setting":"portrait","priority":false,"compressed":true,"hasWebP":true,"hasSrcSet":true,"lazyLoad":true,"body":"# Head Teacher: Kirsti Forrest\n\nProfessional portrait of Kirsti Forrest, our experienced Head Teacher who brings warmth and expertise to Spicebush Montessori School''s leadership.\n\n## Visual Analysis\n- **Emotional Impact**: Approachable, professional, caring\n- **Educational Content**: School leadership representation\n- **Composition**: Classic professional portrait\n- **Symbolism**: Trusted educational leadership\n\n## Usage Guidelines\n- **Primary Use**: Staff directory page\n- **Secondary Use**: About page leadership section\n- **Focal Point**: Warm, welcoming expression\n- **Message**: Professional, caring leadership"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'teachers-leah-walker-lead-teacher',
  'teachers-leah-walker-lead-teacher',
  '{"originalFilename":"Leah Walker Spicebush Montessori - 01.png","optimizedFilename":"teachers-leah-walker-lead-teacher-800x800.webp","category":"teachers","originalWidth":800,"originalHeight":800,"aspectRatio":"1:1","format":"webp","primaryFocalX":50,"primaryFocalY":35,"primaryFocalWeight":10,"primaryFocalDescription":"Leah''s friendly, engaging expression","secondaryFocalX":50,"secondaryFocalY":60,"secondaryFocalWeight":5,"secondaryFocalDescription":"Professional teacher attire","mobileCropX":20,"mobileCropY":10,"mobileCropWidth":60,"mobileCropHeight":60,"tabletCropX":10,"tabletCropY":5,"tabletCropWidth":80,"tabletCropHeight":80,"altText":"Leah Walker, Lead Teacher at Spicebush Montessori School, professional portrait showing warmth and expertise","seoKeywords":["leah walker","lead teacher","montessori educator","spicebush teacher","primary guide","teaching staff"],"contextualDescription":"Professional portrait of Leah Walker, Lead Teacher, radiating warmth and educational expertise","usedOn":["staff-page","programs-primary"],"primaryUse":"Staff directory page","hasHumanFaces":true,"hasChildren":false,"hasMonressoriMaterials":false,"dominantColors":["warm-tones","professional-lighting","neutral-background"],"lighting":"indoor","activity":"portrait","setting":"portrait","priority":false,"compressed":true,"hasWebP":true,"hasSrcSet":true,"lazyLoad":true,"body":"# Lead Teacher: Leah Walker\n\nProfessional portrait of Leah Walker, our dedicated Lead Teacher who brings enthusiasm and Montessori expertise to guide children''s learning journeys.\n\n## Visual Analysis\n- **Emotional Impact**: Friendly, professional, approachable\n- **Educational Content**: Teaching staff representation\n- **Composition**: Professional portrait style\n- **Symbolism**: Dedicated educational guidance\n\n## Usage Guidelines\n- **Primary Use**: Staff directory page\n- **Secondary Use**: Primary program pages\n- **Focal Point**: Engaging, warm expression\n- **Message**: Experienced, caring educator"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'photos',
  'teachers-placeholder-staff-image',
  'teachers-placeholder-staff-image',
  '{"originalFilename":"placeholder.jpg","optimizedFilename":"teachers-placeholder-staff-image-800x800.webp","category":"teachers","originalWidth":800,"originalHeight":800,"aspectRatio":"1:1","format":"webp","primaryFocalX":50,"primaryFocalY":50,"primaryFocalWeight":10,"primaryFocalDescription":"Generic placeholder for staff photos","secondaryFocalX":50,"secondaryFocalY":50,"secondaryFocalWeight":1,"secondaryFocalDescription":"Placeholder image center","mobileCropX":0,"mobileCropY":0,"mobileCropWidth":100,"mobileCropHeight":100,"tabletCropX":0,"tabletCropY":0,"tabletCropWidth":100,"tabletCropHeight":100,"altText":"Placeholder image for staff member photo","seoKeywords":["staff placeholder","default image","profile placeholder"],"contextualDescription":"Generic placeholder image used when staff photos are not yet available","usedOn":["staff-page"],"primaryUse":"Temporary staff photo placeholder","hasHumanFaces":false,"hasChildren":false,"hasMonressoriMaterials":false,"dominantColors":["neutral-gray","placeholder-tone"],"lighting":"mixed","activity":"placeholder","setting":"mixed","priority":false,"compressed":true,"hasWebP":true,"hasSrcSet":false,"lazyLoad":true,"body":"# Staff Photo Placeholder\n\nGeneric placeholder image used temporarily when staff member photos are not yet available or being updated.\n\n## Visual Analysis\n- **Emotional Impact**: Neutral, professional\n- **Educational Content**: N/A\n- **Composition**: Simple placeholder design\n- **Symbolism**: Temporary representation\n\n## Usage Guidelines\n- **Primary Use**: Temporary staff photo replacement\n- **Secondary Use**: Default image fallback\n- **Focal Point**: N/A\n- **Message**: Photo coming soon"}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

-- school-info collection

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'school-info',
  'general',
  'general',
  '{"phone":"(484) 202-0712","email":"information@spicebushmontessori.org","address":{"street":"827 Concord Road","city":"Glen Mills","state":"PA","zip":"19342"},"agesServed":"3 to 6 years","schoolYear":"2025-2026","extendedCareUntil":"5:30 PM","socialMedia":{"facebook":"https://www.facebook.com/SpicebushMontessori","instagram":"https://www.instagram.com/spicebushmontessori"},"founded":2021,"ein":"88-0565930","accreditation":["AMS Certified Teachers","PA Licensed Child Care Center"],"body":"# Spicebush Montessori School\n\nCentral configuration for school-wide information. This data is used across the website to ensure consistency."}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

-- coming-soon collection

INSERT INTO content (type, slug, title, data, status, author_email)
VALUES (
  'coming-soon',
  'config',
  'config',
  '{"enabled":true,"launchDate":"2025-02-01T00:00:00.000Z","headline":"We''re updating our site","message":"While we work on bringing you an improved experience, you can still apply for enrollment!","showNewsletter":false,"newsletterHeading":"Stay Updated","newsletterText":"Subscribe to be notified when we launch!","showContact":false,"showSocial":false,"backgroundImage":"","body":""}'::jsonb,
  'published',
  'migration@spicebushmontessori.org'
)
ON CONFLICT (type, slug) 
DO UPDATE SET 
  title = EXCLUDED.title,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Settings

INSERT INTO settings (key, value)
VALUES (
  'annual_increase_rate',
  '"0.04"'::jsonb
)
ON CONFLICT (key) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

INSERT INTO settings (key, value)
VALUES (
  'coming_soon_launch_date',
  '"2025-02-01"'::jsonb
)
ON CONFLICT (key) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

INSERT INTO settings (key, value)
VALUES (
  'coming_soon_message',
  '"We''re preparing something special for you. Our new website will launch soon with exciting features and resources for families interested in Montessori education."'::jsonb
)
ON CONFLICT (key) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

INSERT INTO settings (key, value)
VALUES (
  'coming_soon_mode',
  '"false"'::jsonb
)
ON CONFLICT (key) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

INSERT INTO settings (key, value)
VALUES (
  'coming_soon_newsletter',
  '"true"'::jsonb
)
ON CONFLICT (key) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

INSERT INTO settings (key, value)
VALUES (
  'current_school_year',
  '"2025-2026"'::jsonb
)
ON CONFLICT (key) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

INSERT INTO settings (key, value)
VALUES (
  'sibling_discount_rate',
  '"0.10"'::jsonb
)
ON CONFLICT (key) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

INSERT INTO settings (key, value)
VALUES (
  'upfront_discount_rate',
  '"0.05"'::jsonb
)
ON CONFLICT (key) 
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- Cleanup
DELETE FROM content WHERE slug = 'test-direct';