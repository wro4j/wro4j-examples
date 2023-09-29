package ro.isdc.wro.examples.app;

import java.io.IOException;
import java.util.Locale;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

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
