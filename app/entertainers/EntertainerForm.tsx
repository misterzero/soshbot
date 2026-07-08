import { saveEntertainer } from "@/app/actions";
import type { schema } from "@/db";

type Entertainer = typeof schema.entertainers.$inferSelect;

export function EntertainerForm({ entertainer }: { entertainer?: Entertainer }) {
  return (
    <form action={saveEntertainer} className="form-grid">
      {entertainer && <input type="hidden" name="id" value={entertainer.id} />}
      <label>
        Name*
        <input name="name" required maxLength={120} defaultValue={entertainer?.name} />
      </label>
      <label>
        Genre
        <input name="genre" maxLength={80} defaultValue={entertainer?.genre ?? ""} />
      </label>
      <label>
        Short bio
        <textarea name="bioShort" maxLength={280} defaultValue={entertainer?.bioShort ?? ""} />
      </label>
      <label>
        Website
        <input name="website" type="url" defaultValue={entertainer?.website ?? ""} />
      </label>
      <label>
        Instagram
        <input
          name="instagram"
          placeholder="@handle"
          maxLength={80}
          defaultValue={entertainer?.socials?.instagram ?? ""}
        />
      </label>
      <label>
        Standard rate ($)
        <input name="standardRate" type="number" min="0" step="25" defaultValue={entertainer?.standardRate ?? ""} />
      </label>
      <label>
        Payout method
        <input name="payoutMethod" maxLength={40} defaultValue={entertainer?.payoutMethod ?? ""} />
      </label>
      <label>
        Match aliases (comma-separated)
        <input name="aliases" maxLength={500} defaultValue={(entertainer?.matchAliases ?? []).join(", ")} />
      </label>
      <button type="submit">{entertainer ? "Save changes" : "Create entertainer"}</button>
    </form>
  );
}
