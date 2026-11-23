(() => {
  'use strict';

  const xml = value => String(value ?? '').replace(/[<>&"']/g, char => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;'
  })[char]).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
  const encoder = new TextEncoder();
  const spreadsheet = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const relationships = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const packageRelationships = 'http://schemas.openxmlformats.org/package/2006/relationships';

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function archive(files) {
    const body = [];
    const directory = [];
    let offset = 0;
    let directorySize = 0;
    const header = (size, fields) => {
      const bytes = new Uint8Array(size);
      const view = new DataView(bytes.buffer);
      for (const [pos, value, length] of fields) {
        if (length === 4) view.setUint32(pos, value, true);
        else view.setUint16(pos, value, true);
      }
      return bytes;
    };
    for (const [path, content] of Object.entries(files)) {
      const name = encoder.encode(path);
      const bytes = encoder.encode(content);
      const crc = crc32(bytes);
      const local = header(30, [[0, 0x04034b50, 4], [4, 20], [14, crc, 4], [18, bytes.length, 4], [22, bytes.length, 4], [26, name.length]]);
      const entry = header(46, [[0, 0x02014b50, 4], [4, 20], [6, 20], [16, crc, 4], [20, bytes.length, 4], [24, bytes.length, 4], [28, name.length], [42, offset, 4]]);
      body.push(local, name, bytes);
      directory.push(entry, name);
      offset += local.length + name.length + bytes.length;
      directorySize += entry.length + name.length;
    }
    const count = Object.keys(files).length;
    const end = header(22, [[0, 0x06054b50, 4], [8, count], [10, count], [12, directorySize, 4], [16, offset, 4]]);
    return new Blob([...body, ...directory, end], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  function workbook(rows) {
    const sheet = rows.map(row => '<row>' + row.map(value => typeof value === 'number' && Number.isFinite(value)
      ? '<c><v>' + value + '</v></c>' : '<c t="inlineStr"><is><t xml:space="preserve">' + xml(value) + '</t></is></c>').join('') + '</row>').join('');
    return archive({
      '[Content_Types].xml': '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
      '_rels/.rels': `<Relationships xmlns="${packageRelationships}"><Relationship Id="rId1" Type="${relationships}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
      'xl/workbook.xml': `<workbook xmlns="${spreadsheet}" xmlns:r="${relationships}"><sheets><sheet name="NP ONE" sheetId="1" r:id="rId1"/></sheets></workbook>`,
      'xl/_rels/workbook.xml.rels': `<Relationships xmlns="${packageRelationships}"><Relationship Id="rId1" Type="${relationships}/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
      'xl/worksheets/sheet1.xml': `<worksheet xmlns="${spreadsheet}"><sheetData>${sheet}</sheetData></worksheet>`
    });
  }

  function download(rows, name) {
    const url = URL.createObjectURL(workbook(rows));
    const link = document.createElement('a');
    link.href = url;
    link.download = name + '.xlsx';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function print(rows, name) {
    const tab = window.open('', '_blank');
    if (!tab) throw new Error('Cho phép cửa sổ bật lên để in hoặc lưu PDF.');
    tab.opener = null;
    tab.document.write(`<!doctype html><meta charset="utf-8"><title>${xml(name)}</title>
      <style>@page{size:landscape;margin:12mm}body{font:12px system-ui}table{border-collapse:collapse;width:100%}th,td{border:1px solid #aaa;padding:4px;text-align:left}thead{display:table-header-group}tr{break-inside:avoid}</style>
      <h1>${xml(name)}</h1><table><thead><tr>${rows[0].map(value => '<th>' + xml(value) + '</th>').join('')}</tr></thead>
      <tbody>${rows.slice(1).map(row => '<tr>' + row.map(value => '<td>' + xml(value) + '</td>').join('') + '</tr>').join('')}</tbody></table>`);
    tab.document.close();
    tab.focus();
    tab.print();
  }

  window.NPReport = { workbook, download, print };
})();
