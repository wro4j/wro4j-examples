package ro.isdc.wro.examples.support.requesthandler;

import java.io.IOException;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import ro.isdc.wro.http.handler.RequestHandlerSupport;


/**
 * A request handler which will build/mutate the model based on provided request parameters.
 *
 * @author Alex Objelean
 */
public class ModelMutatorRequestHandler
    extends RequestHandlerSupport {
  private static final String PATH_FOLDER = "dynamic";
  private static final String MATCHER_REGEX = String.format(".*/%s/.*", PATH_FOLDER);
  @Override
  public boolean accept(final HttpServletRequest request) {
    final String requestURI = request.getRequestURI();
    return requestURI.matches(MATCHER_REGEX);
  }

  @Override
  public void handle(final HttpServletRequest request, final HttpServletResponse response)
      throws IOException {
    try {
      final String updatedPath = computeUpdatedPath(request);
      request.getRequestDispatcher("").forward(request, response);
    } catch(final ServletException e) {
      throw new IOException("Exception while forwarding the request", e);
    }
  }

  private String computeUpdatedPath(final HttpServletRequest request) {
    return null;
  }

  public static void main(final String[] args) {
    System.out.println("/wro/dynamic/test.css".matches(".*/dynamic/.*"));
  }
}
