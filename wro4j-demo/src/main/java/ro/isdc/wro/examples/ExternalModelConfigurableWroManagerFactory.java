/*
 * Copyright (C) 2010.
 * All rights reserved.
 */
package ro.isdc.wro.examples;

import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;

import ro.isdc.wro.extensions.manager.standalone.ExtensionsStandaloneManagerFactory;
import ro.isdc.wro.model.factory.WroModelFactory;
import ro.isdc.wro.model.factory.XmlModelFactory;

/**
 * An example of how resources can be managed without restarting the server.
 *
 * @author Alex Objelean
 */
public class ExternalModelConfigurableWroManagerFactory
  extends ExtensionsStandaloneManagerFactory {
  /**
   * {@inheritDoc}
   */
  @Override
  protected WroModelFactory newModelFactory() {
    return new XmlModelFactory() {
      @Override
      protected InputStream getModelResourceAsStream()
        throws IOException {
        return new FileInputStream("D:\\temp\\____wro\\wro.xml");
      }
    };
  }
}
