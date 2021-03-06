/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
package org.apache.pinot.core.segment.index.loader.defaultcolumn;

import java.io.File;
import java.util.Set;
import org.apache.pinot.core.segment.index.loader.IndexLoadingConfig;
import org.apache.pinot.core.segment.index.metadata.SegmentMetadataImpl;
import org.apache.pinot.core.segment.store.SegmentDirectory;
import org.apache.pinot.spi.data.Schema;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;


public class V1DefaultColumnHandler extends BaseDefaultColumnHandler {
  private static final Logger LOGGER = LoggerFactory.getLogger(V1DefaultColumnHandler.class);

  public V1DefaultColumnHandler(File indexDir, Schema schema, SegmentMetadataImpl segmentMetadata,
      SegmentDirectory.Writer segmentWriter) {
    super(indexDir, schema, segmentMetadata, segmentWriter);
  }

  /**
   * {@inheritDoc}
   */
  @Override
  protected void updateDefaultColumn(String column, DefaultColumnAction action, IndexLoadingConfig indexLoadingConfig)
      throws Exception {
    LOGGER.info("Starting default column action: {} on column: {}", action, column);

    // For UPDATE and REMOVE action, delete existing dictionary and forward index, and remove column metadata
    if (action.isUpdateAction() || action.isRemoveAction()) {
      removeColumnV1Indices(column);
    }

    Set<String> textIndexColumns = indexLoadingConfig.getTextIndexColumns();

    // For ADD and UPDATE action, create new dictionary and forward index, and update column metadata
    if (action.isAddAction() || action.isUpdateAction()) {
      if (textIndexColumns.contains(column)) {
        // create forward index for this text index enabled column
        createV1ForwardIndexForTextIndex(column, indexLoadingConfig);
      } else {
        createColumnV1Indices(column);
      }
    }
  }
}
