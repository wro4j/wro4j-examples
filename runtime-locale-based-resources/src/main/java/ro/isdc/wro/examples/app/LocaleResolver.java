package ro.isdc.wro.examples.app;

import java.util.Locale;

import javax.servlet.http.HttpServletRequest;

import org.apache.commons.lang3.StringUtils;

public class LocaleResolver {
	private static final String PARAM_LOCALE = "locale";
	
	/**
	 * A possible implementation of locale retriever.
	 * 
	 * @return a locale for the provided request. If the locale param is
	 *         available, it will take override the requests localle.
	 */
	public Locale resolve(HttpServletRequest request) {
		String localeParam = request.getParameter(PARAM_LOCALE);
		Locale resolved = request.getLocale();
		if (!StringUtils.isEmpty(localeParam)) {
			resolved = new Locale(localeParam);
		}
		// the implementation could check if the computed locale is supported.
		// If not, it could fallback to a default value.
		return resolved;
	}
}
