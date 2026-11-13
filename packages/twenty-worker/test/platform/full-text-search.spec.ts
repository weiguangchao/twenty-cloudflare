import { describe, expect, it } from 'vitest';

import { runInNewWorkspace } from '../utils/run-in-new-workspace.util';
import { selectRows } from '../utils/select-rows.util';

const createSearchTable = (sql: SqlStorage, tokenizer: string) => {
  sql.exec(
    `CREATE VIRTUAL TABLE "fts_person" USING fts5("name", tokenize = '${tokenizer}')`,
  );
  sql.exec(
    `INSERT INTO "fts_person" ("name") VALUES ('张伟明'), ('北京字节跳动科技'), ('Airbnb Inc'), ('École Zürich')`,
  );
};

const search = (sql: SqlStorage, query: string) =>
  selectRows(
    sql,
    'SELECT "name", bm25("fts_person") AS "rank" FROM "fts_person" WHERE "fts_person" MATCH ? ORDER BY "rank"',
    query,
  );

describe('FTS5 with the trigram tokenizer', () => {
  it('matches Chinese and Latin substrings case-insensitively and ranks with bm25', async () => {
    await runInNewWorkspace(({ storage: { sql } }) => {
      createSearchTable(sql, 'trigram');

      const chineseMatches = search(sql, '字节跳动');

      expect(chineseMatches.map((row) => row.name)).toEqual([
        '北京字节跳动科技',
      ]);
      expect(typeof chineseMatches[0].rank).toBe('number');
      expect(search(sql, 'AIRBN').map((row) => row.name)).toEqual([
        'Airbnb Inc',
      ]);
      expect(search(sql, '张伟明').map((row) => row.name)).toEqual(['张伟明']);
    });
  });

  it('cannot match queries shorter than three characters, so those need instr', async () => {
    await runInNewWorkspace(({ storage: { sql } }) => {
      createSearchTable(sql, 'trigram');

      expect(search(sql, '张伟')).toEqual([]);
      expect(
        selectRows(
          sql,
          'SELECT "name" FROM "fts_person" WHERE instr("name", ?) > 0',
          '张伟',
        ),
      ).toEqual([{ name: '张伟明' }]);
    });
  });

  it('ignores diacritics only with remove_diacritics', async () => {
    await runInNewWorkspace(({ storage: { sql } }) => {
      createSearchTable(sql, 'trigram remove_diacritics 1');

      expect(search(sql, 'zur').map((row) => row.name)).toEqual([
        'École Zürich',
      ]);
    });
  });

  it('rejects raw user input with FTS syntax and accepts it once quoted', async () => {
    await runInNewWorkspace(({ storage: { sql } }) => {
      createSearchTable(sql, 'trigram');

      expect(() => search(sql, 'x"*(')).toThrow();
      expect(search(sql, '"x""*("')).toEqual([]);
    });
  });
});
