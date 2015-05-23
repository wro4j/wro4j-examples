package ro.isdc.wro.examples.app;

import java.io.IOException;
import java.util.Locale;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * Servlet simulating computation of locale based translations.
 */
public class TranslationServlet extends HttpServlet {
	private LocaleResolver localeResolver = new LocaleResolver();
	@Override
	protected void doGet(HttpServletRequest req, HttpServletResponse resp)
			throws ServletException, IOException {
		Locale locale = localeResolver.resolve(req);
		resp.getWriter().println("{\"key\":\"" + locale.toString() + "\"}");
		resp.getWriter().close();
	}
}
