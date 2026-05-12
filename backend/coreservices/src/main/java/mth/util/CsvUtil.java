package mth.util;

import java.io.StringWriter;
import java.util.List;

/**
 * Minimal CSV helper — handles commas, quotes, newlines per RFC 4180.
 * Emits a UTF-8 BOM at the start so Excel opens it with the right encoding.
 */
public class CsvUtil {

	public static String build(List<String> headers, List<List<Object>> rows) {
		StringWriter sw = new StringWriter();
		// UTF-8 BOM — Excel needs this to interpret unicode correctly
		sw.write('﻿');

		writeRow(sw, headers.toArray(new Object[0]));
		for (List<Object> r : rows) writeRow(sw, r.toArray(new Object[0]));
		return sw.toString();
	}

	private static void writeRow(StringWriter sw, Object[] cells) {
		for (int i = 0; i < cells.length; i++) {
			sw.write(escape(cells[i]));
			if (i < cells.length - 1) sw.write(',');
		}
		sw.write("\r\n");
	}

	private static String escape(Object o) {
		if (o == null) return "";
		String s = String.valueOf(o);
		boolean needsQuotes = s.contains(",") || s.contains("\"") || s.contains("\n") || s.contains("\r");
		if (s.contains("\"")) s = s.replace("\"", "\"\"");
		return needsQuotes ? "\"" + s + "\"" : s;
	}
}
