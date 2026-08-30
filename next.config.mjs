import { IMAGE_HOSTS } from './lib/image-hosts.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * Next scaffolds two markdown rule files into the project root when it is
   * started by certain tooling. This project does not use them and they are
   * not wanted in the repository, so generation is turned off here rather
   * than deleting the files each time they reappear.
   */
  agentRules: false,

  images: {
    /**
     * Every `quality` a component asks for has to be listed here. Next 16
     * silently falls back to 75 for anything that isn't, which is not an
     * error and shows up nowhere — the hero was asking for 95 and being
     * served 75 for exactly that reason.
     *
     *   95  the hero plate, the one image worth the bytes
     *   75  the default, used by everything that doesn't say otherwise
     *   70  menu thumbnails, small enough that nobody can tell
     */
    qualities: [70, 75, 95],
    /**
     * The host list lives in lib/image-hosts.mjs, with the reasoning for
     * each one. It is shared with lib/images.ts, which filters out any
     * photo the site could not render — next/image throws on an unlisted
     * host, and a throw here is a 500 on the whole page.
     */
    remotePatterns: IMAGE_HOSTS.map((hostname) => ({
      protocol: 'https',
      hostname,
    })),
  },
};

export default nextConfig;
