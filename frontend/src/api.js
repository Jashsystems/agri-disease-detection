const API_URL = "http://127.0.0.1:8000";


export async function uploadReport({
  crop,
  stage,
  village,
  imageFile,
}) {

  const formData = new FormData();

  formData.append(
    "crop",
    crop
  );

  formData.append(
    "stage",
    stage
  );

  formData.append(
    "village",
    village.name
  );

  formData.append(
    "lat",
    village.lat
  );

  formData.append(
    "lng",
    village.lng
  );

  formData.append(
    "image_file",
    imageFile
  );


  const response = await fetch(
    `${API_URL}/upload-report`,
    {
      method: "POST",
      body: formData,
    }
  );


  if (!response.ok) {
    const error =
      await response.text();

    throw new Error(
      error || "Upload failed"
    );
  }


  return response.json();
}


export async function fetchOfficerQueue() {

  const response = await fetch(
    `${API_URL}/officer-queue`
  );


  if (!response.ok) {
    throw new Error(
      "Failed to fetch officer queue"
    );
  }


  return response.json();
}


export async function confirmCase(
  reportId,
  confirmedDisease,
  officerId = "OFF-001"
) {

  const response = await fetch(
    `${API_URL}/confirm-case`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        report_id: reportId,
        confirmed_disease:
          confirmedDisease,
        officer_id: officerId,
      }),
    }
  );


  if (!response.ok) {

    const error =
      await response.text();

    throw new Error(
      error ||
      "Failed to confirm case"
    );
  }


  return response.json();
}


export async function getAdvisory(
  reportId
) {

  const response = await fetch(
    `${API_URL}/advisory/${reportId}`
  );


  if (!response.ok) {
    throw new Error(
      "Advisory not available"
    );
  }


  return response.json();
}
