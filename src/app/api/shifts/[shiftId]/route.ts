        const shiftQuery = adminDb.collectionGroup("shifts").where("id", "==", shiftId);
        const shiftSnapshot = await shiftQuery.get();

        if (shiftSnapshot.empty) {
            return new NextResponse("Shift not found", { status: 404 });
        }
        const shiftDoc = shiftSnapshot.docs[0];
        const shiftData = shiftDoc.data();

        const isAllowed = await verifyOrgAccess(session.uid, shiftData.orgId, [
            "admin",
            "manager",
        ]);

        if (!isAllowed) {
            return new NextResponse("Forbidden: You do not have permission to delete this shift.", { status: 403 });
        }

        await shiftDoc.ref.delete();