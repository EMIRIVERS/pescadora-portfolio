# Pescadora — Claude Code Rules

## Commands
- `npm run dev` — development server
- `npm run build` — production build
- `npm run lint` — ESLint
- `node scripts/generate-registry.mjs` — regenerate media_registry.json

## Always Do
- Wrap static images in `next/image` unless loaded into Three.js textures
- Clean up Three.js geometries, materials, textures in `useEffect` cleanup
- Clean up GSAP ScrollTriggers in `useEffect` cleanup
- TypeScript strict — no `any`, no `@ts-ignore`
- Keep shaders in `.glsl` files, never as template strings in JS

## Ask First
- Before modifying `media_registry.json`
- Before adding any npm dependency not in: three, gsap, framer-motion, lucide-react
- Before changing scroll architecture

## Never Do
- Never alter `media_registry.json` manually (run the script)
- Never add emoji to source files
- Never set `position: absolute` on the WebGL canvas (must be `fixed`)
- Never commit `.env*.local`
- Never add icon libraries other than `lucide-react`
