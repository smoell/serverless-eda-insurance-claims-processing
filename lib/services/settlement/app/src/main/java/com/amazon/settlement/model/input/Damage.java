// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

package com.amazon.settlement.model.input;

import com.fasterxml.jackson.annotation.JsonProperty;

public class Damage {
  private String name;
  private float confidence;


  // Getter Methods

  public String getName() {
    return name;
  }

  public float getConfidence() {
    return confidence;
  }

  // Setter Methods

  @JsonProperty("Name")
  public void setName(String name) {
    this.name = name;
  }

  @JsonProperty("Confidence")
  public void setConfidence(float confidence) {
    this.confidence = confidence;
  }

  @Override
  public String toString() {
    return "Damage{" +
      "Name='" + name + '\'' +
      ", Confidence=" + confidence +
      '}';
  }
}