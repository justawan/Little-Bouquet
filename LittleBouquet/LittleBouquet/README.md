# Little Bouquet

A single-page bouquet gift built with Next.js, TypeScript and Three.js. Pavel guides the recipient through five questions, then presents the generated arrangement to Polly. Each saved submission includes the answers, the optional message and the deterministic 3D recipe.

## Set up Supabase

1. Create a project at [Supabase Dashboard](https://supabase.com/dashboard). The free plan is suitable for a small personal gift.
2. Open **SQL Editor → New query**, paste the contents of [supabase/schema.sql](supabase/schema.sql), and run it. The migration creates the submissions table, enables row-level security, removes public access, and grants the server role permission to call only the save function for this table.
3. In the project's **Connect** panel, copy the Project URL. In **Settings → API Keys**, create or copy a server-side **Secret key** (the sb_secret_ key). Put these in your local .env.local file or in Vercel's environment settings.

| Variable | Value |
| --- | --- |
| SUPABASE_URL | Your project's HTTPS URL, e.g. https://YOUR-PROJECT.supabase.co |
| SUPABASE_SECRET_KEY | Your Supabase Secret key. Keep it server-side and out of Git. |

The endpoint validates input, limits payload size, and uses idempotent submission IDs. Supabase enforces a project-wide sliding limit of 12 new submissions per 10 minutes and 120 per day inside the same transaction that saves the row. This limits writes without keeping per-visitor IP addresses or fingerprints. A burst of requests can temporarily use up the shared allowance. A retry with the same ID and data can recover a successful write after a dropped connection even while the limit is active.

## Run or test locally

Use Node.js 24 and pnpm 11.25.0.

~~~sh
pnpm install --frozen-lockfile
pnpm dev
~~~

Open [localhost:3000](http://localhost:3000). Add both environment variables and run the migration before testing a real submission. Without that setup, the form can be completed and the save displays an error with a retry. The draft stays in that browser tab's session storage, including the optional message, until a successful save or the end of the browser session.

~~~sh
pnpm test
pnpm build
~~~

The automated tests cover all 640 questionnaire configurations, representative 3D geometry for the four flowers and decorations, and submission validation and error handling using a simulated Supabase endpoint.

## Deploy to Vercel

1. Push the extracted LittleBouquet folder to a Git repository, keeping .env.local out of the repository.
2. In [Vercel Dashboard](https://vercel.com/dashboard), choose **Add New → Project** and import the repository. Choose the **Next.js** framework preset, set the root to the folder with package.json if needed, and use Node.js 24.
3. Before deploying, add SUPABASE_URL, SUPABASE_SECRET_KEY, and ENABLE_EXPERIMENTAL_COREPACK=1 under **Environment Variables**. Corepack uses the pnpm version pinned in package.json. [Vercel build configuration](https://vercel.com/docs/builds/configure-a-build#corepack) Enable them for Production and for any Preview deployments that should actually save responses. Use a separate Supabase project for previews if you want separate data.
4. Deploy. Open the assigned vercel.app address and make one test submission. Confirm the message, answers and configuration appear in Supabase, then remove the test row in Table Editor if desired.
5. For a custom domain, go to **Project → Settings → Domains**, add the domain and set the DNS records Vercel displays. The vercel.app address works without buying a domain. [Vercel domain setup](https://vercel.com/docs/domains/working-with-domains/add-a-domain)
6. To update, edit the project, run the tests, and push to the branch connected to Vercel production. If you change a Vercel environment variable, redeploy to apply it.

## Read messages and analytics

- **Private answers and messages** are in **Supabase Dashboard → your project → Table Editor → bouquet_submissions**. Sort by submitted_at descending. Open a row to read the full message or inspect bouquet_config. Access uses the authenticated Supabase project dashboard.
- **Completed submissions** are saved rows. In **Supabase → SQL Editor**, run the following for the exact count and daily totals. Dates in this query are UTC.

~~~sql
select count(*) as completed from public.bouquet_submissions;

select (submitted_at at time zone 'UTC')::date as day, count(*) as completed
from public.bouquet_submissions
group by 1
order by 1 desc;
~~~

- **Page views, unique visitors, traffic over time and device categories** are in **Vercel → your project → Analytics**. Click **Enable**, then redeploy if prompted. Select Production and a date range. Use the Visitors/Page Views chart and the Device panel. The website sends no answers or messages to analytics. Completion counts use Supabase because Analytics custom events require a paid Vercel plan. [Analytics setup](https://vercel.com/docs/analytics/quickstart) · [Analytics plans](https://vercel.com/docs/analytics/limits-and-pricing)

## Edit the gift

If you already deployed the first version, update the files in the same Git repository and push to the connected branch. Keep your existing Supabase project and Vercel environment variables. The character update uses the existing database schema.

- app/page.tsx contains the questionnaire, penguin scenes and exact welcome/final copy.
- app/style.css contains the responsive layout, character motion and reduced-motion styles.
- lib/gift.ts defines the answer choices, palette and note. If choices change, update the SQL constraints too.
- lib/bouquet.ts builds the custom flower geometry, wrapping and four accessories. app/bouquet-view.tsx handles WebGL and rotation.
- public/ contains transparent cutouts derived from the supplied Pavel and Polly references. The comic panels supply Pavel's open-flipper, curious, and ribbon poses and Polly's happy reaction. The small framed background portraits change with the current question.

## If saving displays an error code

Open the **same Vercel project whose site address you are testing**. If two projects import the same GitHub repository, their environment variables are separate.

| Code | What to check |
| --- | --- |
| CONFIG_MISSING | Add SUPABASE_URL and SUPABASE_SECRET_KEY to the project's Production environment, then redeploy. The Vercel function log shows which variable name is missing. |
| CONFIG_URL | Use the HTTPS Project URL from Supabase Connect. |
| CONFIG_KEY or SUPABASE_ACCESS | Use a current sb_secret_ key from the same Supabase project as the URL. Redeploy after saving it in Vercel. |
| SUPABASE_RPC | Run [check-saving.sql](supabase/check-saving.sql) in that Supabase project's SQL Editor. If any result is false, apply [schema.sql](supabase/schema.sql) in the same project. |
| SUPABASE_CONNECTION or SUPABASE_RESPONSE | Check Vercel Logs for /api/submit and confirm that your Supabase project is active. The log omits secrets and questionnaire content. |
