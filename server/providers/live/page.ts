import type { PageExcerpt } from "@/server/domain/types";
import type { PageReader } from "@/server/providers/types";

/**
 * Live reader for the hackathon home page.
 * When this is filled in, allow only public http(s) URLs and refuse
 * link-local, loopback, and private addresses before fetching.
 */
export class LivePageReader implements PageReader {
  readonly name = "live";

  async read(url: string): Promise<PageExcerpt> {
    throw new Error(
      `No page fetch is implemented for ${url}. Add it in server/providers/live/page.ts.`,
    );
  }
}
